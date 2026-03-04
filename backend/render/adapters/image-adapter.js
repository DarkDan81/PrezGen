function clampNumber(value, min, max, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
}

function imageAdapter(block) {
    const fit = typeof block.config?.fitMode === 'string' ? block.config.fitMode : 'contain';
    const position = typeof block.config?.focalPoint === 'string' ? block.config.focalPoint : 'center center';
    const zoom = clampNumber(block.config?.zoom, 100, 300, 100);
    const offsetX = clampNumber(block.config?.offsetX, -500, 500, 0);
    const offsetY = clampNumber(block.config?.offsetY, -500, 500, 0);
    return {
        image: block.config?.url || block.config?.src || '',
        imageFit: fit,
        imagePosition: position,
        imageZoom: zoom,
        imageOffsetX: offsetX,
        imageOffsetY: offsetY,
    };
}

module.exports = { imageAdapter };
