const sanitizeHtml = require('sanitize-html');

const sanitizeOptions = {
    allowedTags: [
        'div', 'p', 'span', 'br',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li',
        'b', 'strong', 'i', 'em', 'u',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'img', 'a',
    ],
    allowedAttributes: {
        '*': ['class', 'style'],
        a: ['href', 'target', 'rel'],
        img: ['src', 'alt', 'title', 'style'],
    },
    allowedSchemes: ['http', 'https', 'data'],
    allowedSchemesByTag: {
        img: ['http', 'https', 'data'],
    },
    allowedStyles: {
        '*': {
            color: [/^#[0-9a-fA-F]{3,8}$/, /^rgb\(/, /^rgba\(/, /^[a-zA-Z]+$/],
            'background-color': [/^#[0-9a-fA-F]{3,8}$/, /^rgb\(/, /^rgba\(/, /^[a-zA-Z]+$/],
            'text-align': [/^(left|right|center|justify)$/],
            'font-size': [/^\d+(px|em|rem|%)$/],
            'font-weight': [/^\d+$/, /^(normal|bold|bolder|lighter)$/],
            'line-height': [/^\d+(\.\d+)?(px|em|rem|%)?$/],
            margin: [/^[\d.\s%a-zA-Z-]+$/],
            padding: [/^[\d.\s%a-zA-Z-]+$/],
            width: [/^[\d.\s%a-zA-Z-]+$/],
            height: [/^[\d.\s%a-zA-Z-]+$/],
            'max-width': [/^[\d.\s%a-zA-Z-]+$/],
            'max-height': [/^[\d.\s%a-zA-Z-]+$/],
            display: [/^(block|inline|inline-block|flex|grid)$/],
            gap: [/^[\d.\s%a-zA-Z-]+$/],
            'grid-template-columns': [/^[\d.\s%a-zA-Z()-]+$/],
            'grid-template-rows': [/^[\d.\s%a-zA-Z()-]+$/],
            'object-fit': [/^(contain|cover|fill|none|scale-down)$/],
            'border-radius': [/^[\d.\s%a-zA-Z-]+$/],
            border: [/^[\d.\s%a-zA-Z#(),-]+$/],
        },
    },
};

function sanitizeRichHtml(html) {
    return sanitizeHtml(html || '', sanitizeOptions);
}

module.exports = {
    sanitizeRichHtml,
};

