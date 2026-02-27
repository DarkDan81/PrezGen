const fs = require('fs');
const path = require('path');
const chartRenderer = require('./blocks/chart');
const tableRenderer = require('./blocks/table');
const kpiRenderer = require('./blocks/kpi');
const textImageRenderer = require('./blocks/text-image');

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderCharacter(slide, charactersMap) {
    const charKey = slide.character_img || slide.character;
    if (!charKey || !charactersMap[charKey]) return '';

    const fileName = charactersMap[charKey];
    const charPath = `/content/assets/${fileName}`;
    const pos = slide.character_pos || slide.pos;
    const posClass = pos ? `char-${pos}` : '';

    return `<img src="${charPath}" class="slide-character ${posClass}" alt="">`;
}

function renderBlocks(slide) {
    return (slide.blocks || []).map((block) => {
        if (block.chart) return chartRenderer(block);
        if (block.table) return tableRenderer(block);
        if (block.kpi_cards) return kpiRenderer(block);
        if (block.text || block.image) return textImageRenderer(block);
        return '';
    }).join('');
}

function loadThemeCss(themeName) {
    try {
        const themePath = path.join(__dirname, '..', 'themes', themeName, 'styles.css');
        return fs.readFileSync(themePath, 'utf8');
    } catch (_e) {
        return '';
    }
}

function buildSlides(data) {
    const themeName = data.meta.theme;
    const logoPath = data.meta.logoPath || '';
    const charactersMap = data.meta.characters || {};
    const themeCss = loadThemeCss(themeName);

    const slidesHtml = data.slides.map((slide, index) => {
        const isTitle = slide.type === 'title';
        const characterHtml = renderCharacter(slide, charactersMap);
        const blocksHtml = renderBlocks(slide);

        const slideContent = isTitle
            ? `
                <div class="decor-blob"></div>
                <div class="decor-line-left"></div>
                ${logoPath ? `<img src="${logoPath}" class="title-logo" alt="logo">` : ''}
                <div class="title-content">
                    <h1>${escapeHtml(slide.title || '')}</h1>
                    <p>${escapeHtml(slide.subtitle || '')}</p>
                </div>
                ${characterHtml}`
            : `
                ${logoPath ? `<img src="${logoPath}" class="corner-logo" alt="logo">` : ''}
                <div class="decor-blob"></div>
                <div class="decor-line-left"></div>
                <div class="slide-decor-line"></div>
                <div class="slide-header">
                    <h2>${escapeHtml(slide.title || '')}</h2>
                    ${slide.subtitle ? `<div class="slide-subtitle">${escapeHtml(slide.subtitle)}</div>` : ''}
                </div>
                <div class="slide-body">${blocksHtml}</div>
                ${characterHtml}`;

        return `<div class="slide-frame">
            <section class="slide ${isTitle ? 'title-slide' : ''}" id="slide-${index}">
                ${slideContent}
            </section>
        </div>`;
    }).join('');

    return `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <link rel="stylesheet" href="/themes/${themeName}/styles.css">
        ${themeCss ? `<style>${themeCss}</style>` : ''}
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2"></script>
    </head>
    <body class="viewer-mode">
        <div id="presentation-viewport">${slidesHtml}</div>

        <script>
            Chart.register(ChartDataLabels);

            function rescale() {
                const scale = window.innerWidth / 1920;
                document.querySelectorAll('.slide').forEach((slide) => {
                    slide.style.transformOrigin = 'top left';
                    slide.style.transform = 'scale(' + scale + ')';
                    const frame = slide.parentElement;
                    frame.style.height = (1080 * scale) + 'px';
                    frame.style.width = (1920 * scale) + 'px';
                    frame.style.overflow = 'hidden';
                });
            }

            function buildChartOptions(config) {
                const isHorizontal = config.horizontal === true;
                const labelsCount = config.data?.labels?.length || 0;
                const denseLabels = labelsCount > 8;
                return {
                    indexAxis: isHorizontal ? 'y' : 'x',
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: false,
                    layout: { padding: { top: 28, bottom: 28, left: 16, right: 24 } },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: {
                                font: { size: denseLabels ? 18 : 22, weight: 'bold' },
                                maxRotation: isHorizontal ? 0 : 35,
                                minRotation: isHorizontal ? 0 : 35,
                            },
                        },
                        y: {
                            ticks: {
                                font: { size: denseLabels ? 16 : 20, weight: 'bold' },
                            },
                        },
                    },
                    plugins: {
                        legend: {
                            display: (config.data?.datasets || []).length > 1,
                            position: 'bottom',
                            labels: { font: { size: 18, weight: 'bold' } },
                        },
                        datalabels: {
                            display: config.showLabels !== false,
                            anchor: (ctx) => (ctx.dataset.data[ctx.dataIndex] >= 0 ? 'end' : 'start'),
                            align: (ctx) => {
                                if (isHorizontal) return 'right';
                                return ctx.dataset.data[ctx.dataIndex] >= 0 ? 'top' : 'bottom';
                            },
                            offset: 8,
                            color: '#333',
                            font: { size: denseLabels ? 16 : 20, weight: '700' },
                            formatter: (v) => {
                                if (v === null || v === undefined) return '';
                                if (config.shorten && Math.abs(v) >= 1000000) {
                                    return (v / 1000000).toFixed(1) + 'M';
                                }
                                return Math.round(v).toLocaleString('en-US');
                            },
                        },
                    },
                };
            }

            function initCharts() {
                document.querySelectorAll('canvas').forEach((canvas) => {
                    try {
                        const ctx = canvas.getContext('2d');
                        const config = JSON.parse(canvas.dataset.config);
                        new Chart(ctx, {
                            type: canvas.dataset.type,
                            data: config.data,
                            options: buildChartOptions(config),
                        });
                    } catch (error) {
                        console.error('Chart init error', error);
                    }
                });
            }

            window.addEventListener('load', () => {
                rescale();
                initCharts();
            });
            window.addEventListener('resize', rescale);
        </script>
    </body>
    </html>`;
}

module.exports = { buildSlides };
