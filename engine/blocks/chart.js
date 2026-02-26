const barRenderer = require('./chart-bar');
const horizontalRenderer = require('./chart-horizontal');
const lineRenderer = require('./chart-line');

module.exports = (block) => {
    const kind = block.chart.kind || 'line';
    if (kind === 'horizontalBar') return horizontalRenderer(block);
    if (kind === 'bar') return barRenderer(block);
    return lineRenderer(block);
};