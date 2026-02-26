const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const THEMES_DIR = path.join(__dirname, '../../themes');

function normalizeThemeId(themeId) {
    if (!themeId) return '';
    return themeId.startsWith('theme-') ? themeId.slice('theme-'.length) : themeId;
}

function listThemes() {
    if (!fs.existsSync(THEMES_DIR)) return [];

    return fs
        .readdirSync(THEMES_DIR, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .filter((entry) => fs.existsSync(path.join(THEMES_DIR, entry.name, 'styles.css')))
        .map((entry) => {
            const slug = entry.name;
            const id = `theme-${slug}`;
            const themeYamlPath = path.join(THEMES_DIR, slug, 'theme.yaml');
            let tokens = {};
            if (fs.existsSync(themeYamlPath)) {
                try {
                    const parsed = yaml.load(fs.readFileSync(themeYamlPath, 'utf8'));
                    if (parsed && typeof parsed === 'object') tokens = parsed;
                } catch (_e) {
                    tokens = {};
                }
            }
            return {
                id,
                name: slug,
                baseCssPath: `/themes/${slug}/styles.css`,
                tokens,
                isSystem: true,
            };
        });
}

function getThemeById(themeId) {
    const slug = normalizeThemeId(themeId);
    const all = listThemes();
    return all.find((theme) => theme.id === `theme-${slug}`) || null;
}

module.exports = {
    getThemeById,
    listThemes,
    normalizeThemeId,
};

