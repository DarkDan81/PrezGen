const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const PptxGenJS = require('pptxgenjs');
const { buildPreviewHtml } = require('./preview-service');
const { buildNativePptxDeck, buildHybridBlocksPptxDeck } = require('./pptx-native-export');
const { updateRenderJob } = require('../repositories/render-job-repository');

function buildExportBaseHref() {
    const port = Number.parseInt(process.env.PORT, 10) || 3100;
    return `http://127.0.0.1:${port}/`;
}

function prepareHtmlForPuppeteer(html) {
    if (typeof html !== 'string' || !html.includes('<head>')) return html;
    if (html.includes('<base href=')) return html;
    return html.replace('<head>', `<head>\n        <base href="${buildExportBaseHref()}">`);
}

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
        await page.setContent(prepareHtmlForPuppeteer(html), { waitUntil: 'networkidle0', timeout: 0 });
        await new Promise((resolve) => setTimeout(resolve, 1200));
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
        await page.setContent(prepareHtmlForPuppeteer(html), { waitUntil: 'networkidle0', timeout: 0 });
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

async function buildNativePptx(presentationId, outputPath) {
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE'; // 13.333 x 7.5
    pptx.author = 'PrezGen';
    pptx.company = 'PrezGen';
    pptx.subject = 'Presentation Export';
    pptx.title = 'PrezGen Export';

    const result = buildNativePptxDeck({ pptx, presentationId });
    if (!result.slidesCount) {
        throw new Error('No slides found for PPTX export');
    }
    await pptx.writeFile({ fileName: outputPath });
    return result;
}

async function captureHybridBlocksAssets(html, exportDir, prefix) {
    const browser = await puppeteer.launch({ headless: 'new' });
    try {
        const page = await browser.newPage();
        await page.setViewport({
            width: 1920,
            height: 1080,
            deviceScaleFactor: 1,
        });
        await page.emulateMediaType('screen');
        await page.setContent(prepareHtmlForPuppeteer(html), { waitUntil: 'networkidle0', timeout: 0 });
        await new Promise((resolve) => setTimeout(resolve, 1400));

        const slideHandles = await page.$$('.slide');
        const assets = [];

        for (let slideIndex = 0; slideIndex < slideHandles.length; slideIndex += 1) {
            const slideHandle = slideHandles[slideIndex];
            const bgName = `${prefix}_slide_${String(slideIndex + 1).padStart(3, '0')}_bg.png`;
            const bgPath = path.join(exportDir, bgName);
            const blocksMeta = await slideHandle.$$eval('.block-wrapper[data-block-id]', (nodes) => {
                return nodes.map((node) => {
                    const el = node;
                    const rect = el.getBoundingClientRect();
                    const slide = el.closest('.slide');
                    const slideRect = slide ? slide.getBoundingClientRect() : { left: 0, top: 0 };
                    return {
                        blockId: el.getAttribute('data-block-id') || '',
                        blockType: el.getAttribute('data-block-type') || '',
                        x: Math.max(0, rect.left - slideRect.left),
                        y: Math.max(0, rect.top - slideRect.top),
                        w: Math.max(1, rect.width),
                        h: Math.max(1, rect.height),
                    };
                });
            });

            await page.evaluate((idx) => {
                const allSlides = Array.from(document.querySelectorAll('.slide'));
                allSlides.forEach((slide, i) => {
                    const keep = i === idx;
                    slide.style.visibility = keep ? 'visible' : 'hidden';
                    slide.style.pointerEvents = keep ? 'auto' : 'none';
                    if (keep) {
                        const header = slide.querySelector('.slide-header');
                        const body = slide.querySelector('.slide-body');
                        const titleContent = slide.querySelector('.title-content');
                        if (header) header.style.visibility = 'hidden';
                        if (body) body.style.visibility = 'hidden';
                        if (titleContent) titleContent.style.visibility = 'hidden';
                    }
                });
            }, slideIndex);

            await slideHandle.screenshot({ path: bgPath });

            const slideAssets = {
                backgroundPath: bgPath,
                blocks: [],
            };

            await page.evaluate((idx) => {
                const allSlides = Array.from(document.querySelectorAll('.slide'));
                allSlides.forEach((slide, i) => {
                    const keep = i === idx;
                    slide.style.visibility = keep ? 'visible' : 'hidden';
                    slide.style.pointerEvents = keep ? 'auto' : 'none';
                    if (keep) {
                        const header = slide.querySelector('.slide-header');
                        const body = slide.querySelector('.slide-body');
                        const titleContent = slide.querySelector('.title-content');
                        if (header) header.style.visibility = 'visible';
                        if (body) body.style.visibility = 'visible';
                        if (titleContent) titleContent.style.visibility = 'visible';
                    }
                });
            }, slideIndex);

            for (let blockIndex = 0; blockIndex < blocksMeta.length; blockIndex += 1) {
                const block = blocksMeta[blockIndex];
                const isText = String(block.blockType) === 'text';
                if (isText) {
                    slideAssets.blocks.push({
                        blockId: block.blockId,
                        blockType: 'text',
                        rect: { x: block.x, y: block.y, w: block.w, h: block.h },
                    });
                    continue;
                }
                const safeBlockId = String(block.blockId || `b${blockIndex + 1}`).replace(/[^a-zA-Z0-9_-]+/g, '_');
                const blockName = `${prefix}_slide_${String(slideIndex + 1).padStart(3, '0')}_${safeBlockId}.png`;
                const blockPath = path.join(exportDir, blockName);
                const selector = `.slide#slide-${slideIndex} .block-wrapper[data-block-id="${String(block.blockId).replace(/"/g, '\\"')}"]`;
                const element = await page.$(selector);
                if (!element) {
                    slideAssets.blocks.push({
                        blockId: block.blockId,
                        blockType: block.blockType,
                        rect: { x: block.x, y: block.y, w: block.w, h: block.h },
                    });
                    continue;
                }
                await element.screenshot({ path: blockPath });
                slideAssets.blocks.push({
                    blockId: block.blockId,
                    blockType: block.blockType,
                    imagePath: blockPath,
                    rect: { x: block.x, y: block.y, w: block.w, h: block.h },
                });
            }

            assets.push(slideAssets);
        }

        return assets;
    } finally {
        await browser.close();
    }
}

async function buildHybridBlocksPptx(presentationId, html, exportDir, baseName, outputPath) {
    const assets = await captureHybridBlocksAssets(html, exportDir, baseName);
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';
    pptx.author = 'PrezGen';
    pptx.company = 'PrezGen';
    pptx.subject = 'Presentation Export';
    pptx.title = 'PrezGen Export';
    const result = buildHybridBlocksPptxDeck({ pptx, presentationId, slideAssets: assets });
    if (!result.slidesCount) {
        throw new Error('No slides found for PPTX export');
    }
    await pptx.writeFile({ fileName: outputPath });
    const tempFiles = assets.flatMap((slide) => {
        const files = [];
        if (slide.backgroundPath) files.push(slide.backgroundPath);
        slide.blocks.forEach((b) => {
            if (b.imagePath) files.push(b.imagePath);
        });
        return files;
    });
    return { ...result, tempFiles };
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
    let tempHybridFiles = [];
    try {
        const exportDir = ensureExportDir();
        const baseName = `presentation_${job.presentationId}_${job.id}`;
        const fileName = `${baseName}.pptx`;
        const outputPath = path.join(exportDir, fileName);
        const requestedMode = String(job.options?.mode || '');
        const mode = requestedMode === 'raster' ? 'raster' : requestedMode === 'hybrid_blocks' ? 'hybrid_blocks' : 'hybrid_native';
        const warnings = [];
        const html = buildPreviewHtml(job.presentationId);

        if (mode === 'raster') {
            if (!html) {
                throw new Error('Presentation not found for rendering');
            }
            tempImages = await captureSlidesAsPng(html, exportDir, baseName);
            if (!tempImages.length) {
                throw new Error('No slides found for PPTX export');
            }
            await buildPptxFromSlideImages(tempImages, outputPath);
            warnings.push({
                code: 'SAFE_RASTER_EXPORT',
                message: 'PPTX export is generated via deterministic slide rasterization',
            });
        } else if (mode === 'hybrid_native') {
            try {
                const nativeResult = await buildNativePptx(job.presentationId, outputPath);
                warnings.push(...(nativeResult.warnings || []));
            } catch (nativeError) {
                if (!html) {
                    throw nativeError;
                }
                tempImages = await captureSlidesAsPng(html, exportDir, baseName);
                if (!tempImages.length) {
                    throw nativeError;
                }
                await buildPptxFromSlideImages(tempImages, outputPath);
                warnings.push({
                    code: 'NATIVE_EXPORT_FALLBACK',
                    message: `Native mapper failed and raster fallback was used: ${nativeError.message}`,
                });
                warnings.push({
                    code: 'SAFE_RASTER_EXPORT',
                    message: 'PPTX export is generated via deterministic slide rasterization',
                });
            }
        } else {
            try {
                if (!html) {
                    throw new Error('Presentation not found for rendering');
                }
                const hybridResult = await buildHybridBlocksPptx(job.presentationId, html, exportDir, baseName, outputPath);
                warnings.push(...(hybridResult.warnings || []));
                tempHybridFiles = hybridResult.tempFiles || [];
            } catch (hybridError) {
                if (!html) {
                    throw hybridError;
                }
                tempImages = await captureSlidesAsPng(html, exportDir, baseName);
                if (!tempImages.length) {
                    throw hybridError;
                }
                await buildPptxFromSlideImages(tempImages, outputPath);
                warnings.push({
                    code: 'HYBRID_BLOCKS_FALLBACK',
                    message: `Hybrid blocks mapper failed and raster fallback was used: ${hybridError.message}`,
                });
                warnings.push({
                    code: 'SAFE_RASTER_EXPORT',
                    message: 'PPTX export is generated via deterministic slide rasterization',
                });
            }
        }

        updateRenderJob(job.id, {
            status: 'done',
            result: {
                fileName,
                path: `/dist/export/${fileName}`,
                mode,
                warnings,
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
        tempHybridFiles.forEach((imgPath) => {
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

