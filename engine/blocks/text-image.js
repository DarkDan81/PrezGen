function escapeAttr(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/\"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function textLength(html) {
    return String(html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().length;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function parseFocalToken(token, axis) {
    const value = String(token || '').trim().toLowerCase();
    if (value.endsWith('%')) {
        const n = Number(value.replace('%', ''));
        if (Number.isFinite(n)) return clamp(n, 0, 100);
    }
    if (axis === 'x') {
        if (value === 'left') return 0;
        if (value === 'right') return 100;
        return 50;
    }
    if (value === 'top') return 0;
    if (value === 'bottom') return 100;
    return 50;
}

function resolveObjectPosition(basePosition, offsetX, offsetY) {
    const parts = String(basePosition || 'center center').split(/\s+/).filter(Boolean);
    const xToken = parts[0] || 'center';
    const yToken = parts[1] || 'center';
    const x = clamp(parseFocalToken(xToken, 'x') + offsetX, 0, 100);
    const y = clamp(parseFocalToken(yToken, 'y') + offsetY, 0, 100);
    return `${x}% ${y}%`;
}

module.exports = (block) => {
    const style = `style="flex: ${block.flexWidth || 1}"`;

    if (block.text) {
        const denseClass = textLength(block.text) > 900 ? 'dense' : '';
        return `<div class="block-wrapper text-block ${denseClass}" ${style}><div class="block-text">${block.text}</div></div>`;
    }

    if (block.image) {
        const fit = escapeAttr(block.imageFit || 'contain');
        const basePosition = block.imagePosition || 'center center';
        const zoom = Number(block.imageZoom || 100);
        const offsetX = Number(block.imageOffsetX || 0);
        const offsetY = Number(block.imageOffsetY || 0);
        const safeOffsetX = Number.isFinite(offsetX) ? offsetX : 0;
        const safeOffsetY = Number.isFinite(offsetY) ? offsetY : 0;
        const safeZoom = Number.isFinite(zoom) ? Math.max(100, zoom) : 100;
        const isCover = String(block.imageFit || '').toLowerCase() === 'cover';
        const position = isCover
            ? resolveObjectPosition(basePosition, safeOffsetX, safeOffsetY)
            : String(basePosition || 'center center');
        const transform = isCover ? `scale(${safeZoom / 100})` : 'scale(1)';
        return `
            <div class="block-wrapper image-block" ${style}>
                <div class="image-container"><img src="${escapeAttr(block.image)}" alt="" style="object-fit:${fit};object-position:${position};transform:${escapeAttr(transform)};"></div>
            </div>`;
    }

    return '';
};
