const { buildSlides } = require('../../engine/slide-builder');
const { buildRenderModelByPresentationId } = require('../render/model-builder');

function buildPresentationData(presentationId) {
    return buildRenderModelByPresentationId(presentationId);
}

function buildPreviewHtml(presentationId) {
    const model = buildPresentationData(presentationId);
    if (!model) return null;
    return buildSlides(model);
}

module.exports = {
    buildPresentationData,
    buildPreviewHtml,
};

