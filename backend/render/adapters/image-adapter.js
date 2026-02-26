function imageAdapter(block) {
    return {
        image: block.config?.url || block.config?.src || '',
    };
}

module.exports = { imageAdapter };

