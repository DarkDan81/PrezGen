const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { migrate } = require('../backend/db/migrate');
const { getDb } = require('../backend/db/connection');
const { SCHEMA_VERSION } = require('../backend/utils/response');
const { createPresentation } = require('../backend/repositories/presentation-repository');
const { createSlide, updateSlideById } = require('../backend/repositories/slide-repository');
const { createBlock } = require('../backend/repositories/block-repository');
const { createDataset } = require('../backend/repositories/dataset-repository');

const DEMO_NAME = 'QA Demo Deck';
const SOURCE_ASSETS_DIR = path.join(__dirname, '../data/demo-assets');
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];

function nowIso() {
    return new Date().toISOString();
}

function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

function cleanupOldDemoDecks() {
    const db = getDb();
    const oldIds = db.prepare('SELECT id FROM presentations WHERE name = ?').all(DEMO_NAME).map((row) => row.id);
    const delStmt = db.prepare('DELETE FROM presentations WHERE id = ?');
    oldIds.forEach((presentationId) => {
        delStmt.run(presentationId);
        fs.rmSync(path.join(__dirname, `../data/presentations/${presentationId}`), { recursive: true, force: true });
    });
}

function findAssetFile(baseName) {
    for (const ext of IMAGE_EXTS) {
        const fullPath = path.join(SOURCE_ASSETS_DIR, `${baseName}${ext}`);
        if (fs.existsSync(fullPath)) {
            return { fullPath, fileName: `${baseName}${ext}` };
        }
    }
    return null;
}

function copyAssetToPresentation(presentationId, baseName) {
    const found = findAssetFile(baseName);
    if (!found) {
        return `https://placehold.co/1200x675?text=${encodeURIComponent(baseName)}`;
    }

    const targetDir = path.join(__dirname, `../data/presentations/${presentationId}/assets`);
    ensureDir(targetDir);
    const targetPath = path.join(targetDir, found.fileName);
    fs.copyFileSync(found.fullPath, targetPath);
    return `/content/presentations/${presentationId}/assets/${found.fileName}`;
}

function createSlideRow(presentationId, order, type, title, subtitle = '') {
    const now = nowIso();
    const slide = createSlide({
        id: randomUUID(),
        presentationId,
        order,
        type,
        title,
        subtitle,
        notes: null,
        layoutPresetId: null,
        slotAssignments: [],
        createdAt: now,
        updatedAt: now,
    });
    return slide;
}

function createBlockRow(presentationId, slideId, order, type, config) {
    const now = nowIso();
    return createBlock({
        id: randomUUID(),
        presentationId,
        slideId,
        order,
        type,
        layout: null,
        config,
        createdAt: now,
        updatedAt: now,
    });
}

function bindLayout(slideId, layoutPresetId, slotAssignments) {
    updateSlideById(slideId, {
        layoutPresetId,
        slotAssignments,
        updatedAt: nowIso(),
    });
}

function createDatasets(presentationId) {
    const now = nowIso();
    const salesDataset = createDataset({
        id: randomUUID(),
        presentationId,
        name: 'sales_overview',
        sourceType: 'manual_table',
        columns: [
            { key: 'month', label: 'Month', type: 'string', nullable: false },
            { key: 'revenue', label: 'Revenue', type: 'number', nullable: false },
            { key: 'orders', label: 'Orders', type: 'number', nullable: false },
            { key: 'region', label: 'Region', type: 'string', nullable: false },
            { key: 'manager', label: 'Manager', type: 'string', nullable: false },
            { key: 'growth', label: 'Growth', type: 'number', nullable: false },
        ],
        rows: [
            { month: 'January', revenue: 100000, orders: 420, region: 'North', manager: 'Alex', growth: 12 },
            { month: 'February', revenue: 200000, orders: 690, region: 'North', manager: 'Alex', growth: 18 },
            { month: 'March', revenue: 150000, orders: 560, region: 'South', manager: 'Nina', growth: 9 },
            { month: 'April', revenue: 175000, orders: 610, region: 'South', manager: 'Nina', growth: 14 },
            { month: 'May', revenue: 210000, orders: 740, region: 'East', manager: 'Ivan', growth: 11 },
            { month: 'June', revenue: 230000, orders: 780, region: 'East', manager: 'Ivan', growth: 16 },
        ],
        meta: { seededBy: 'seed-qa-demo' },
        createdAt: now,
        updatedAt: now,
    });

    return { salesDataset };
}

function run() {
    migrate();
    cleanupOldDemoDecks();

    const createdAt = nowIso();
    const presentationId = randomUUID();
    createPresentation({
        id: presentationId,
        name: DEMO_NAME,
        description: 'Generated demo deck for QA of themes and layout presets.',
        themeId: 'theme-eurofoods',
        themeOverrides: null,
        status: 'draft',
        schemaVersion: SCHEMA_VERSION,
        createdAt,
        updatedAt: createdAt,
    });

    const images = {
        hero: copyAssetToPresentation(presentationId, 'hero'),
        side1: copyAssetToPresentation(presentationId, 'side-1'),
        side2: copyAssetToPresentation(presentationId, 'side-2'),
        side3: copyAssetToPresentation(presentationId, 'side-3'),
        grid1: copyAssetToPresentation(presentationId, 'grid-1'),
        grid2: copyAssetToPresentation(presentationId, 'grid-2'),
        grid3: copyAssetToPresentation(presentationId, 'grid-3'),
        grid4: copyAssetToPresentation(presentationId, 'grid-4'),
        alt1: copyAssetToPresentation(presentationId, 'alt-1'),
        alt2: copyAssetToPresentation(presentationId, 'alt-2'),
        alt3: copyAssetToPresentation(presentationId, 'alt-3'),
        alt4: copyAssetToPresentation(presentationId, 'alt-4'),
    };

    const { salesDataset } = createDatasets(presentationId);

    const s1 = createSlideRow(presentationId, 0, 'title', 'QA Demo Deck', 'Theme and Layout Validation');
    const s2 = createSlideRow(presentationId, 1, 'content', 'Single Column', 'Text + KPI');
    const s3 = createSlideRow(presentationId, 2, 'content', 'Two Columns', 'Text + Image');
    const s4 = createSlideRow(presentationId, 3, 'content', '2x2 Grid', 'Mixed block types');
    const s5 = createSlideRow(presentationId, 4, 'content', 'Content + 3 Images Right', 'One big + two small');
    const s6 = createSlideRow(presentationId, 5, 'content', '3 Images Left + Content', 'Mirrored composition');
    const s7 = createSlideRow(presentationId, 6, 'content', 'Content + 4 Images Right', '2x2 image grid');
    const s8 = createSlideRow(presentationId, 7, 'content', '4 Images Left + Content', 'Mirrored 2x2 image grid');
    const s9 = createSlideRow(presentationId, 8, 'title', 'Section Break', 'Final quality checks');
    const s10 = createSlideRow(presentationId, 9, 'content', 'Final Notes', 'Long text and table readability');

    const s2Text = createBlockRow(presentationId, s2.id, 0, 'text', {
        html: [
            '<h3>Scope</h3>',
            '<p>This slide validates typography, spacing, and card rhythm across medium-length paragraphs.</p>',
            '<p>We intentionally mix short and long sentences to confirm stable wrapping and line-height behavior in constrained containers.</p>',
            '<ul>',
            '<li>Theme colors and contrast</li>',
            '<li>Text density and paragraph rhythm</li>',
            '<li>Card border/radius consistency</li>',
            '</ul>',
        ].join(''),
    });
    const s2Kpi = createBlockRow(presentationId, s2.id, 1, 'kpi', {
        mode: 'manual',
        items: [
            { label: 'Revenue', value: '450,000', unit: '$', growth: '+12%' },
            { label: 'Orders', value: '3,800', unit: '', growth: '+8%' },
            { label: 'NPS', value: '68', unit: '', growth: '+4' },
        ],
    });
    bindLayout(s2.id, 'layout-single-column', [
        { slotId: 'slot_main', blockId: s2Text.id },
        { slotId: 'slot_secondary', blockId: s2Kpi.id },
    ]);

    const s3Text = createBlockRow(presentationId, s3.id, 0, 'text', {
        html: [
            '<h3>Marketing Story</h3>',
            '<p>Left side is narrative. Right side is hero visual for impact.</p>',
            '<p>Long token stress test: <b>ULTRA_LONG_KEYWORD_FOR_LAYOUT_OVERFLOW_VALIDATION_2026_Q1_MARKETING_CHANNEL_BREAKDOWN</b></p>',
        ].join(''),
    });
    const s3Image = createBlockRow(presentationId, s3.id, 1, 'image', { url: images.hero });
    bindLayout(s3.id, 'layout-two-columns', [
        { slotId: 'slot_left', blockId: s3Text.id },
        { slotId: 'slot_right', blockId: s3Image.id },
    ]);

    const s4Text = createBlockRow(presentationId, s4.id, 0, 'text', {
        html: [
            '<h3>Highlights</h3>',
            '<p>Multi-block density test with mixed content ratios.</p>',
            '<p>Checklist: labels legibility, chart padding, table column clipping, KPI compact mode.</p>',
        ].join(''),
    });
    const s4Chart = createBlockRow(presentationId, s4.id, 1, 'chart', {
        datasetId: salesDataset.id,
        kind: 'bar',
        xField: 'month',
        valueField: 'revenue',
        seriesField: '',
        limit: 6,
        showLabels: true,
    });
    const s4Table = createBlockRow(presentationId, s4.id, 2, 'table', {
        datasetId: salesDataset.id,
        limit: 6,
        transpose: false,
    });
    const s4Kpi = createBlockRow(presentationId, s4.id, 3, 'kpi', {
        mode: 'dataset',
        datasetId: salesDataset.id,
        labelField: 'region',
        valueField: 'revenue',
        growthField: 'growth',
        limit: 4,
    });
    bindLayout(s4.id, 'layout-2x2-grid', [
        { slotId: 'slot_a', blockId: s4Text.id },
        { slotId: 'slot_b', blockId: s4Chart.id },
        { slotId: 'slot_c', blockId: s4Table.id },
        { slotId: 'slot_d', blockId: s4Kpi.id },
    ]);

    const s5Content = createBlockRow(presentationId, s5.id, 0, 'text', {
        html: [
            '<h3>Content First</h3>',
            '<p>Large text area plus image cluster on the right.</p>',
            '<p>This block is intentionally verbose to verify that text does not overlap with cluster images and keeps margin discipline.</p>',
        ].join(''),
    });
    const s5Big = createBlockRow(presentationId, s5.id, 1, 'image', { url: images.hero });
    const s5Sm1 = createBlockRow(presentationId, s5.id, 2, 'image', { url: images.side1 });
    const s5Sm2 = createBlockRow(presentationId, s5.id, 3, 'image', { url: images.side2 });
    bindLayout(s5.id, 'layout-hero-left-stack-right-3', [
        { slotId: 'slot_content', blockId: s5Content.id },
        { slotId: 'slot_img_big', blockId: s5Big.id },
        { slotId: 'slot_img_sm1', blockId: s5Sm1.id },
        { slotId: 'slot_img_sm2', blockId: s5Sm2.id },
    ]);

    const s6Big = createBlockRow(presentationId, s6.id, 0, 'image', { url: images.alt1 });
    const s6Sm1 = createBlockRow(presentationId, s6.id, 1, 'image', { url: images.alt2 });
    const s6Sm2 = createBlockRow(presentationId, s6.id, 2, 'image', { url: images.alt3 });
    const s6Content = createBlockRow(presentationId, s6.id, 3, 'text', {
        html: [
            '<h3>Mirrored Variant</h3>',
            '<p>Image-heavy left side, descriptive block on right.</p>',
            '<p>Expected behavior: right text remains readable even if left assets have narrow portrait aspect ratios.</p>',
        ].join(''),
    });
    bindLayout(s6.id, 'layout-stack-left-3-hero-right', [
        { slotId: 'slot_img_big', blockId: s6Big.id },
        { slotId: 'slot_img_sm1', blockId: s6Sm1.id },
        { slotId: 'slot_img_sm2', blockId: s6Sm2.id },
        { slotId: 'slot_content', blockId: s6Content.id },
    ]);

    const s7Content = createBlockRow(presentationId, s7.id, 0, 'text', {
        html: [
            '<h3>2x2 Media Cluster</h3>',
            '<p>Useful for product gallery or campaign snapshots.</p>',
            '<p>Use this slide to validate slot cropping and anchor defaults for each image cell.</p>',
        ].join(''),
    });
    const s7I1 = createBlockRow(presentationId, s7.id, 1, 'image', { url: images.grid1 });
    const s7I2 = createBlockRow(presentationId, s7.id, 2, 'image', { url: images.grid2 });
    const s7I3 = createBlockRow(presentationId, s7.id, 3, 'image', { url: images.grid3 });
    const s7I4 = createBlockRow(presentationId, s7.id, 4, 'image', { url: images.grid4 });
    bindLayout(s7.id, 'layout-hero-left-stack-right-4', [
        { slotId: 'slot_content', blockId: s7Content.id },
        { slotId: 'slot_img_1', blockId: s7I1.id },
        { slotId: 'slot_img_2', blockId: s7I2.id },
        { slotId: 'slot_img_3', blockId: s7I3.id },
        { slotId: 'slot_img_4', blockId: s7I4.id },
    ]);

    const s8I1 = createBlockRow(presentationId, s8.id, 0, 'image', { url: images.side1 });
    const s8I2 = createBlockRow(presentationId, s8.id, 1, 'image', { url: images.side2 });
    const s8I3 = createBlockRow(presentationId, s8.id, 2, 'image', { url: images.side3 });
    const s8I4 = createBlockRow(presentationId, s8.id, 3, 'image', { url: images.alt4 });
    const s8Content = createBlockRow(presentationId, s8.id, 4, 'text', {
        html: [
            '<h3>Mirrored 2x2</h3>',
            '<p>Same geometry family with opposite direction.</p>',
            '<p>Check visual balance between image mass and content block in mirrored layout.</p>',
        ].join(''),
    });
    bindLayout(s8.id, 'layout-image-full-caption', [
        { slotId: 'slot_img_1', blockId: s8I1.id },
        { slotId: 'slot_img_2', blockId: s8I2.id },
        { slotId: 'slot_img_3', blockId: s8I3.id },
        { slotId: 'slot_img_4', blockId: s8I4.id },
        { slotId: 'slot_content', blockId: s8Content.id },
    ]);

    const s10Text = createBlockRow(presentationId, s10.id, 0, 'text', {
        html: [
            '<h3>Readability Check</h3>',
            '<p>Use this slide to validate long paragraph wrapping, bullet spacing, and general rhythm in both light and dark UI modes.</p>',
            '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>',
            '<p>Very long URL-like token: https://example.com/very/long/path/for/layout/regression/testing/that/should/not/break/the/grid/or-overlap-elements</p>',
            '<ul>',
            '<li>Short point</li>',
            '<li>Medium point with additional wording for realistic content cadence</li>',
            '<li>Long point that intentionally stretches the available line width to test wrapping and prevent clipping in narrow columns</li>',
            '</ul>',
        ].join(''),
    });
    const s10Table = createBlockRow(presentationId, s10.id, 1, 'table', {
        datasetId: salesDataset.id,
        limit: 6,
        transpose: false,
    });
    bindLayout(s10.id, 'layout-two-columns', [
        { slotId: 'slot_left', blockId: s10Text.id },
        { slotId: 'slot_right', blockId: s10Table.id },
    ]);

    console.log('QA demo deck created.');
    console.log(`Presentation name: ${DEMO_NAME}`);
    console.log(`Presentation ID: ${presentationId}`);
    console.log('Source images dir:', SOURCE_ASSETS_DIR);
}

run();
