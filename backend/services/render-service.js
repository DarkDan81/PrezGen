const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
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

function queuePdfJob(job) {
    setTimeout(() => {
        processPdfJob(job);
    }, 0);
}

module.exports = {
    queuePdfJob,
};

