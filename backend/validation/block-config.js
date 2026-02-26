function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function ensureString(details, path, value, required = true) {
    if (value === undefined || value === null || value === '') {
        if (required) details.push({ path, rule: 'required', message: `${path} is required` });
        return;
    }
    if (typeof value !== 'string') {
        details.push({ path, rule: 'string', message: `${path} must be a string` });
    }
}

function ensurePositiveNumber(details, path, value) {
    if (value === undefined || value === null) return;
    if (typeof value !== 'number' || value <= 0) {
        details.push({ path, rule: 'number', message: `${path} must be a positive number` });
    }
}

function validateChartConfig(config, details) {
    ensureString(details, 'config.datasetId', config.datasetId);
    ensureString(details, 'config.kind', config.kind);
    ensureString(details, 'config.xField', config.xField);
    ensureString(details, 'config.valueField', config.valueField);
    if (config.seriesField !== undefined) ensureString(details, 'config.seriesField', config.seriesField, false);
    if (config.kind && !new Set(['line', 'bar', 'horizontalBar']).has(config.kind)) {
        details.push({ path: 'config.kind', rule: 'enum', message: 'config.kind must be line, bar, or horizontalBar' });
    }
    ensurePositiveNumber(details, 'config.limit', config.limit);
}

function validateTableConfig(config, details) {
    ensureString(details, 'config.datasetId', config.datasetId);
    if (config.columns !== undefined && (!Array.isArray(config.columns) || config.columns.some((c) => typeof c !== 'string'))) {
        details.push({ path: 'config.columns', rule: 'array', message: 'config.columns must be a string array' });
    }
    if (config.sort !== undefined) {
        if (!isObject(config.sort)) {
            details.push({ path: 'config.sort', rule: 'object', message: 'config.sort must be an object' });
        } else {
            ensureString(details, 'config.sort.by', config.sort.by);
            if (config.sort.direction && !new Set(['asc', 'desc']).has(config.sort.direction)) {
                details.push({ path: 'config.sort.direction', rule: 'enum', message: 'config.sort.direction must be asc or desc' });
            }
        }
    }
    ensurePositiveNumber(details, 'config.limit', config.limit);
}

function validateKpiConfig(config, details) {
    const mode = config.mode || 'dataset';
    if (!new Set(['manual', 'dataset']).has(mode)) {
        details.push({ path: 'config.mode', rule: 'enum', message: 'config.mode must be manual or dataset' });
        return;
    }
    if (mode === 'manual') {
        if (!Array.isArray(config.items)) {
            details.push({ path: 'config.items', rule: 'array', message: 'config.items must be an array in manual mode' });
        }
        return;
    }
    ensureString(details, 'config.datasetId', config.datasetId);
    ensureString(details, 'config.labelField', config.labelField);
    ensureString(details, 'config.valueField', config.valueField);
    ensurePositiveNumber(details, 'config.limit', config.limit);
}

function validateTextConfig(config, details) {
    ensureString(details, 'config.html', config.html);
}

function validateImageConfig(config, details) {
    const hasUrl = typeof config.url === 'string' && config.url.trim();
    const hasSrc = typeof config.src === 'string' && config.src.trim();
    if (!hasUrl && !hasSrc) {
        details.push({ path: 'config.url', rule: 'required', message: 'config.url or config.src is required' });
    }
}

function validateBlockConfig(type, config) {
    const details = [];
    if (!isObject(config)) {
        return [{ path: 'config', rule: 'object', message: 'config must be an object' }];
    }
    if (type === 'chart') validateChartConfig(config, details);
    if (type === 'table') validateTableConfig(config, details);
    if (type === 'kpi') validateKpiConfig(config, details);
    if (type === 'text') validateTextConfig(config, details);
    if (type === 'image') validateImageConfig(config, details);
    return details;
}

module.exports = { validateBlockConfig };

