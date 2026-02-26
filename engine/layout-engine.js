const WIDTHS = {
    chart: 0.6,       // График занимает 60%
    table_wide: 0.6,  // Широкая таблица
    table_narrow: 0.4,// Узкая таблица (или транспонированная)
    kpi_cards: 0.35,  // KPI карточки узкие
    text: 0.4,        // Текст обычно сбоку
    image: 0.4        // Картинка
};

function getBlockWidth(block) {
    if (block.chart) return WIDTHS.chart;
    if (block.kpi_cards) return WIDTHS.kpi_cards;
    if (block.text) return WIDTHS.text;
    if (block.image) return WIDTHS.image;
    if (block.table) {
        // Если в таблице 3 колонки или меньше (после транспонирования) — она узкая
        return block.headers.length <= 3 ? WIDTHS.table_narrow : WIDTHS.table_wide;
    }
    return 0.5;
}

function planSlides(rawSlides) {
    let finalSlides = [];

    rawSlides.forEach(raw => {
        if (raw.type === 'title' || !raw.blocks) {
            finalSlides.push(raw); return;
        }

        let currentBlocks = [];
        let currentWidth = 0;
        let part = 1;

        raw.blocks.forEach((block) => {
            const w = getBlockWidth(block);

            if (currentWidth + w > 1.05 && currentBlocks.length > 0) {
                finalizeSlide(currentBlocks, currentWidth);
                finalSlides.push({ ...raw, title: part > 1 ? `${raw.title} (ч. ${part})` : raw.title, blocks: currentBlocks });
                currentBlocks = []; currentWidth = 0; part++;
            }
            
            block.flexWidth = w;
            currentBlocks.push(block);
            currentWidth += w;
        });

        if (currentBlocks.length > 0) {
            finalizeSlide(currentBlocks, currentWidth);
            finalSlides.push({ ...raw, title: part > 1 ? `${raw.title} (продолжение)` : raw.title, blocks: currentBlocks });
        }
    });

    return finalSlides;
}

function finalizeSlide(blocks, totalWidth) {
    const scale = 1 / totalWidth;
    blocks.forEach(b => {
        b.flexWidth = b.flexWidth * scale;
        // МАГИЯ: если блоков больше одного и один из них карточки — делаем их вертикальными
        if (blocks.length > 1 && b.kpi_cards) {
            b.isVertical = true;
        }
    });
}

module.exports = { planSlides };