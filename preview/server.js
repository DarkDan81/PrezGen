const express = require('express');
const path = require('path');
const { getPresentation } = require('../engine/parser');
const { buildSlides } = require('../engine/slide-builder');

const app = express();
const port = 3000;

app.use('/themes', express.static(path.join(__dirname, '../themes')));

app.use('/content', express.static(path.join(__dirname, '../presentations/2025-year-summary')));

app.get('/', (req, res) => {
    const prezaPath = path.join(__dirname, '../presentations/2025-year-summary');
    const data = getPresentation(prezaPath);
    const html = buildSlides(data);
    res.send(html);
});

app.listen(port, () => console.log(`Preview at http://localhost:${port}`));