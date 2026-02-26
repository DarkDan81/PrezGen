module.exports = (block) => {
    const style = `style="flex: ${block.flexWidth || 1}"`;

    if (block.text) {
        return `<div class="block-wrapper text-block" ${style}><div class="block-text">${block.text}</div></div>`;
    }

    if (block.image) {
        return `
            <div class="block-wrapper image-block" ${style}>
                <div class="image-container"><img src="${block.image}"></div>
            </div>`;
    }

    return '';
};