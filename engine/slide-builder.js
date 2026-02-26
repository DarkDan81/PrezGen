const chartRenderer = require('./blocks/chart');
const tableRenderer = require('./blocks/table');
const kpiRenderer = require('./blocks/kpi');
const textImageRenderer = require('./blocks/text-image');

function buildSlides(data) {
    const themeName = data.meta.theme;
    const logoPath = "/content/data/logo.png";

    const charactersMap = data.meta.characters || {};

    const slidesHtml = data.slides.map((slide, index) => {
        const isTitle = slide.type === 'title';
        let characterHtml = "";
        const charKey = slide.character_img || slide.character; // поддержка обоих вариантов ключа

        if (charKey && charactersMap[charKey]) {
            const fileName = charactersMap[charKey];
            const charPath = `/content/assets/${fileName}`;
            
            // Берем позицию из slide.character_pos или slide.pos. 
            // Если ничего не указано — НЕ ставим класс по умолчанию, чтобы найти ошибку
            const pos = slide.character_pos || slide.pos; 
            const posClass = pos ? `char-${pos}` : ''; 
            
            characterHtml = `<img src="${charPath}" class="slide-character ${posClass}">`;
        }
        const blocksHtml = (slide.blocks || []).map(block => {
            if (block.chart) return chartRenderer(block);
            if (block.table) return tableRenderer(block);
            if (block.kpi_cards) return kpiRenderer(block);
            if (block.text || block.image) return textImageRenderer(block);
            return '';
        }).join('');

        let slideContent = "";
        if (isTitle) {
            slideContent = `
                <div class="decor-blob"></div>
                <div class="decor-line-left"></div>
                <img src="${logoPath}" class="title-logo">
                <div class="title-content">
                    <h1>${slide.title}</h1>
                    <p>${slide.subtitle || ''}</p>
                </div>
                ${characterHtml}`;
        } else {
            slideContent = `
                <img src="${logoPath}" class="corner-logo">
                <div class="decor-blob"></div>
                <div class="decor-line-left"></div>
                <div class="slide-decor-line"></div>
                <div class="slide-header">
                    <h2>${slide.title || ''}</h2>
                    ${slide.subtitle ? `<div class="slide-subtitle">${slide.subtitle}</div>` : ''}
                </div>
                <div class="slide-body">${blocksHtml}</div>
                ${characterHtml}`;
        }

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
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2"></script>
    </head>
    <body class="viewer-mode">
        <div id="presentation-viewport">${slidesHtml}</div>

        <script>
            Chart.register(ChartDataLabels);

            function rescale() {
                // Считаем масштаб точно по ширине окна без искусственных отступов
                const scale = window.innerWidth / 1920;
                
                document.querySelectorAll('.slide').forEach(slide => {
                    slide.style.transformOrigin = 'top left'; // Фиксируем точку трансформации
                    slide.style.transform = 'scale(' + scale + ')';
                    
                    // Родительский контейнер (slide-frame) должен быть ровно по размеру отмасштабированного слайда
                    const frame = slide.parentElement;
                    frame.style.height = (1080 * scale) + 'px';
                    frame.style.width = (1920 * scale) + 'px';
                    frame.style.overflow = 'hidden';
                });
            }

            function autoFit() {
                document.querySelectorAll('.table-block').forEach(block => {
                    const table = block.querySelector('table');
                    if (!table) return;
                    let fontSize = 28;
                    table.style.fontSize = fontSize + 'px';
                    while (table.offsetHeight > block.offsetHeight && fontSize > 10) {
                        fontSize -= 0.5;
                        table.style.fontSize = fontSize + 'px';
                    }
                });

                document.querySelectorAll('.kpi-card').forEach(card => {
                    const valueSpan = card.querySelector('.value');
                    const row = card.querySelector('.kpi-value-row');
                    if (!valueSpan || !row) return;
                    let fontSize = 110; 
                    valueSpan.style.fontSize = fontSize + 'px';
                    const maxWidth = card.offsetWidth - 60; 
                    while (valueSpan.scrollWidth > maxWidth && fontSize > 14) {
                        fontSize -= 2;
                        valueSpan.style.fontSize = fontSize + 'px';
                    }
                    const cardStyle = window.getComputedStyle(card);
                    const padding = parseInt(cardStyle.paddingTop) + parseInt(cardStyle.paddingBottom);
                    const label = card.querySelector('.label');
                    const growth = card.querySelector('.growth');
                    const availableHeight = card.offsetHeight - padding - (label ? label.offsetHeight : 0) - (growth ? growth.offsetHeight : 0) - 10;
                    while (row.offsetHeight > availableHeight && fontSize > 14) {
                        fontSize -= 1;
                        valueSpan.style.fontSize = fontSize + 'px';
                    }
                });

                document.querySelectorAll('.text-block').forEach(block => {
                    const content = block.querySelector('.block-text');
                    if (!content) return;
                    let fontSize = 28;
                    content.style.fontSize = fontSize + 'px';
                    const headings = content.querySelectorAll('h3');
                    const updateHeadings = (size) => {
                        headings.forEach(h => h.style.fontSize = (size * 1.2) + 'px');
                    };
                    while (content.scrollHeight > block.offsetHeight && fontSize > 20) {
                        fontSize -= 1;
                        content.style.fontSize = fontSize + 'px';
                        updateHeadings(fontSize);
                    }
                });
            }

            window.onload = () => {
                rescale();
                
                document.querySelectorAll('canvas').forEach(canvas => {
                    try {
                        const ctx = canvas.getContext('2d');
                        const config = JSON.parse(canvas.dataset.config);
                        const isHorizontal = config.horizontal;
                        const itemsCount = config.data.labels.length;
                        
                        new Chart(ctx, {
                            type: canvas.dataset.type,
                            data: config.data,
                            options: {
                                indexAxis: isHorizontal ? 'y' : 'x',
                                responsive: true,
                                maintainAspectRatio: false,
                                layout: { padding: { top: 50, bottom: 50, left: 20, right: 60 } },
                                scales: {
                                    x: { 
                                        grid: { display: false }, 
                                        ticks: { 
                                            font: { size: config.largeLabels ? 22 : 14, weight: 'bold' },
                                            // ВОТ ТУТ: делаем подписи снизу вертикальными
                                            minRotation: 90, 
                                            maxRotation: 90
                                        } 
                                    },
                                    y: { 
                                        ticks: { font: { size: 14, weight: 'bold' } } 
                                    }
                                },
                                plugins: { 
                                    legend: { display: config.data.datasets.length > 1, position: 'bottom', labels: { font: { size: 18, weight: 'bold' } } },
                                    datalabels: { 
                                        display: config.showLabels !== false,
                                        anchor: (context) => context.dataset.data[context.dataIndex] >= 0 ? 'end' : 'start',
                                        align: (context) => isHorizontal ? 'right' : (context.dataset.data[context.dataIndex] >= 0 ? 'top' : 'bottom'),
                                        offset: 10, color: '#333',
                                        font: { size: itemsCount > 10 ? 14 : 20, weight: '900' },
                                        
                                        // ЛОГИКА СОКРАЩЕНИЯ
                                        formatter: (v) => {
                                            if (v === null || v === undefined) return '';
                                            if (config.shorten && Math.abs(v) >= 1000000) {
                                                return (v / 1000000).toFixed(1);
                                            }
                                            return Math.round(v).toLocaleString('ru-RU');
                                        }
                                    }
                                }
                            }
                        });
                    } catch (e) { console.error(e); }
                });

                setTimeout(autoFit, 300);
                setTimeout(autoFit, 1000);
            };

            window.onresize = rescale;
        </script>
    </body>
    </html>`;
}

module.exports = { buildSlides };