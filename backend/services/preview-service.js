const { buildSlides } = require('../../engine/slide-builder');
const { buildRenderModelByPresentationId } = require('../render/model-builder');

function buildPresentationData(presentationId) {
    return buildRenderModelByPresentationId(presentationId);
}

function buildPreviewHtml(presentationId) {
    const model = buildPresentationData(presentationId);
    if (!model) return null;
    return buildSlides(model);
}

function buildThemePreviewData({ themeSlug, tokens }) {
    const monthHeaders = ['January', 'February', 'March', 'April', 'May', 'June'];
    return {
        meta: {
            theme: themeSlug || 'factory-blueprint',
            themeTokens: tokens || {},
            characters: {},
        },
        slides: [
            {
                type: 'title',
                title: 'Theme Preview',
                subtitle: 'PPTX-Safe Golden Scenes',
            },
            {
                type: 'content',
                title: 'Content Scene',
                subtitle: 'Typography and safe-zone',
                blocks: [
                    {
                        _blockId: 'text-1',
                        text: [
                            '<h3>Scope</h3>',
                            '<p>This scene validates readability, spacing and hierarchy.</p>',
                            '<ul>',
                            '<li>Heading and subtitle contrast</li>',
                            '<li>Body rhythm and list markers</li>',
                            '<li>Decor interference with content</li>',
                            '</ul>',
                        ].join(''),
                    },
                ],
            },
            {
                type: 'content',
                title: 'Table Scene',
                subtitle: 'Header and grid readability',
                layoutPreset: {
                    id: 'layout-single-full',
                    name: 'Single Full',
                    schema: {
                        grid: { columns: '1fr', rows: '1fr', areas: ['main'], gap: 20 },
                        slots: [{ id: 'slot_main', area: 'main', allowedBlockTypes: ['table'] }],
                    },
                },
                slotAssignments: [{ slotId: 'slot_main', blockId: 'table-1' }],
                blocks: [
                    {
                        _blockId: 'table-1',
                        table: { compact: false },
                        headers: ['Month', 'Revenue', 'Orders', 'Region', 'Manager', 'Growth'],
                        data: [
                            { Month: 'January', Revenue: '100,000', Orders: '420', Region: 'North', Manager: 'Alex', Growth: '12' },
                            { Month: 'February', Revenue: '200,000', Orders: '690', Region: 'North', Manager: 'Alex', Growth: '18' },
                            { Month: 'March', Revenue: '150,000', Orders: '560', Region: 'South', Manager: 'Nina', Growth: '9' },
                            { Month: 'April', Revenue: '175,000', Orders: '610', Region: 'South', Manager: 'Nina', Growth: '14' },
                            { Month: 'May', Revenue: '210,000', Orders: '740', Region: 'East', Manager: 'Ivan', Growth: '11' },
                            { Month: 'June', Revenue: '230,000', Orders: '780', Region: 'East', Manager: 'Ivan', Growth: '16' },
                        ],
                    },
                ],
            },
            {
                type: 'content',
                title: 'Chart Scene',
                subtitle: 'Palette and axis labels',
                blocks: [
                    {
                        _blockId: 'chart-1',
                        chart: { kind: 'bar', show_labels: true, shorten: false },
                        headers: ['Group', 'Metric', ...monthHeaders],
                        data: [
                            {
                                Metric: 'Revenue',
                                January: 100000,
                                February: 200000,
                                March: 150000,
                                April: 175000,
                                May: 210000,
                                June: 230000,
                            },
                        ],
                    },
                ],
            },
            {
                type: 'content',
                title: 'Cards Scene',
                subtitle: 'Surface and accent consistency',
                blocks: [
                    {
                        _blockId: 'kpi-1',
                        kpi_cards: [
                            { label: 'North', value: '100000', growth: '+12' },
                            { label: 'South', value: '200000', growth: '+18' },
                            { label: 'East', value: '150000', growth: '+9' },
                            { label: 'West', value: '175000', growth: '+14' },
                        ],
                    },
                ],
            },
        ],
    };
}

function buildThemePreviewHtml(params) {
    return buildSlides(buildThemePreviewData(params));
}

module.exports = {
    buildThemePreviewData,
    buildThemePreviewHtml,
    buildPresentationData,
    buildPreviewHtml,
};

