const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { planSlides } = require('./layout-engine');

function processData(block, master) {
    // ТЕПЕРЬ СМОТРИМ И НА kpi_cards
    const config = block.chart || block.table || block.kpi_cards;
    if (!config || !config.from_csv) return;

    // 1. Фильтруем строки по группе
    block.data = master.rows.filter(r => 
        r.Group && r.Group.toLowerCase() === config.from_csv.toLowerCase()
    );
    block.headers = master.headers;

    // 2. Транспонирование только для ТАБЛИЦ
    if (block.table) {
        const h = block.headers;
        const d = block.data;
        const firstColName = block.table.parameter_label || 'Параметр';
        const newHeaders = [firstColName];
        d.forEach(row => newHeaders.push(row[h[1]] || '—'));
        const newRows = [];
        h.slice(2).forEach(colName => {
            if (d.some(row => row[colName] && row[colName].trim() !== '')) {
                const newRow = { [firstColName]: colName };
                d.forEach((row, i) => newRow[newHeaders[i+1]] = row[colName]);
                newRows.push(newRow);
            }
        });
        block.headers = newHeaders;
        block.data = newRows;
    }
}

function getPresentation(dirPath) {
    const yamlPath = path.join(dirPath, 'presentation.yaml');
    const presentation = yaml.load(fs.readFileSync(yamlPath, 'utf8'));

    const masterPath = path.join(dirPath, 'data', 'master_data.csv');
    if (!fs.existsSync(masterPath)) return presentation;

    const content = fs.readFileSync(masterPath, 'utf8').trim();
    const lines = content.split(/\r?\n/);
    const del = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(del).map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1).map(line => {
        const values = line.split(del).map(v => {
            return v.trim()
                    .replace(/^"|"$/g, '') // УДАЛЯЕМ КАВЫЧКИ в начале и в конце строки
                    .replace(/""/g, '"');   // Исправляем двойные кавычки внутри текста
        });
        return headers.reduce((obj, h, i) => { obj[h] = values[i]; return obj; }, {});
    });

    presentation.slides.forEach(slide => {
        if (slide.blocks) {
            slide.blocks.forEach(block => processData(block, { rows, headers }));
        }
    });

    presentation.slides = planSlides(presentation.slides);
    return presentation;
}

module.exports = { getPresentation };