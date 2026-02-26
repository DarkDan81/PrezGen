function textAdapter(block) {
    return {
        text: block.config?.html || '',
    };
}

module.exports = { textAdapter };

