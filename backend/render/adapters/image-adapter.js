function imageAdapter(block) {
    const fit = typeof block.config?.fitMode === 'string' ? block.config.fitMode : 'contain';
    const position = typeof block.config?.focalPoint === 'string' ? block.config.focalPoint : 'center center';
    return {
        image: block.config?.url || block.config?.src || '',
        imageFit: fit,
        imagePosition: position,
    };
}

module.exports = { imageAdapter };
