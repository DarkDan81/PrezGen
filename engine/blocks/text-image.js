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

module.exports = (block) => {
    const style = `style="flex: ${block.flexWidth || 1}"`;

    if (block.text) {
        const denseClass = textLength(block.text) > 900 ? 'dense' : '';
        return `<div class="block-wrapper text-block ${denseClass}" ${style}><div class="block-text">${block.text}</div></div>`;
    }

    if (block.image) {
        return `
            <div class="block-wrapper image-block" ${style}>
                <div class="image-container"><img src="${escapeAttr(block.image)}" alt=""></div>
            </div>`;
    }

    return '';
};
