const { sanitizeRichHtml } = require('../../services/sanitize-service');

function textAdapter(block) {
    return {
        text: sanitizeRichHtml(block.config?.html || ''),
    };
}

module.exports = { textAdapter };
