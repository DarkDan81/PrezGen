const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const PptxGenJS = require('pptxgenjs');
const { buildPreviewHtml } = require('./preview-service');
const { updateRenderJob } = require('../repositories/render-job-repository');

function ensureExportDir() {
    const dir = path.join(__dirname, '../../dist/export');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
}

async function renderPdfFromHtml(html, outputPath) {
    const browser = await puppeteer.launch({ headless: 'new' });
    try {
        const page = await browser.newPage();
        await page.setViewport({
            width: 1920,
            height: 1080,
            deviceScaleFactor: 1,
        });
        await page.emulateMediaType('screen');
        await page.setContent(html, { waitUntil: 'load', timeout: 0 });
        await page.pdf({
            path: outputPath,
            width: '1920px',
            height: '1080px',
            printBackground: true,
            displayHeaderFooter: false,
            preferCSSPageSize: true,
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
        });
    } finally {
        await browser.close();
    }
}

async function captureSlidesAsPng(html, exportDir, prefix) {
    const browser = await puppeteer.launch({ headless: 'new' });
    try {
        const page = await browser.newPage();
        await page.setViewport({
            width: 1920,
            height: 1080,
            deviceScaleFactor: 1,
        });
        await page.emulateMediaType('screen');
        await page.setContent(html, { waitUntil: 'networkidle0', timeout: 0 });
        await new Promise((resolve) => setTimeout(resolve, 1200));
        const frameHandles = await page.$$('.slide-frame');

        const imagePaths = [];
        for (let i = 0; i < frameHandles.length; i += 1) {
            const imgName = `${prefix}_slide_${String(i + 1).padStart(3, '0')}.png`;
            const imgPath = path.join(exportDir, imgName);
            await frameHandles[i].screenshot({
                path: imgPath,
            });
            imagePaths.push(imgPath);
        }

        return imagePaths;
    } finally {
        await browser.close();
    }
}

async function buildPptxFromSlideImages(imagePaths, outputPath) {
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE'; // 13.333 x 7.5
    pptx.author = 'PrezGen';
    pptx.company = 'PrezGen';
    pptx.subject = 'Presentation Export';
    pptx.title = 'PrezGen Export';

    imagePaths.forEach((imgPath) => {
        const slide = pptx.addSlide();
        slide.addImage({ path: imgPath, x: 0, y: 0, w: 13.333, h: 7.5 });
    });

    await pptx.writeFile({ fileName: outputPath });
}

async function processPdfJob(job) {
    const now = new Date().toISOString();
    updateRenderJob(job.id, { status: 'running', updatedAt: now });

    try {
        const html = buildPreviewHtml(job.presentationId);
        if (!html) {
            throw new Error('Presentation not found for rendering');
        }

        const exportDir = ensureExportDir();
        const fileName = `presentation_${job.presentationId}_${job.id}.pdf`;
        const outputPath = path.join(exportDir, fileName);
        await renderPdfFromHtml(html, outputPath);

        updateRenderJob(job.id, {
            status: 'done',
            result: {
                fileName,
                path: `/dist/export/${fileName}`,
            },
            error: null,
            updatedAt: new Date().toISOString(),
        });
    } catch (error) {
        updateRenderJob(job.id, {
            status: 'failed',
            error: { message: error.message },
            updatedAt: new Date().toISOString(),
        });
    }
}

async function processPptxJob(job) {
    const now = new Date().toISOString();
    updateRenderJob(job.id, { status: 'running', updatedAt: now });

    let tempImages = [];
    try {
        const html = buildPreviewHtml(job.presentationId);
        if (!html) {
            throw new Error('Presentation not found for rendering');
        }

        const exportDir = ensureExportDir();
        const baseName = `presentation_${job.presentationId}_${job.id}`;
        const fileName = `${baseName}.pptx`;
        const outputPath = path.join(exportDir, fileName);

        tempImages = await captureSlidesAsPng(html, exportDir, baseName);
        if (!tempImages.length) {
            throw new Error('No slides found for PPTX export');
        }

        await buildPptxFromSlideImages(tempImages, outputPath);

        updateRenderJob(job.id, {
            status: 'done',
            result: {
                fileName,
                path: `/dist/export/${fileName}`,
                warnings: [
                    {
                        code: 'SAFE_RASTER_EXPORT',
                        message: 'PPTX export is generated via deterministic slide rasterization',
                    },
                ],
            },
            error: null,
            updatedAt: new Date().toISOString(),
        });
    } catch (error) {
        updateRenderJob(job.id, {
            status: 'failed',
            error: { message: error.message },
            updatedAt: new Date().toISOString(),
        });
    } finally {
        tempImages.forEach((imgPath) => {
            try {
                if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
            } catch (_e) {
                // no-op
            }
        });
    }
}

function queuePdfJob(job) {
    setTimeout(() => {
        processPdfJob(job);
    }, 0);
}

function queuePptxJob(job) {
    setTimeout(() => {
        processPptxJob(job);
    }, 0);
}

module.exports = {
    queuePdfJob,
    queuePptxJob,
};

