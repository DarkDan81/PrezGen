const { createApp } = require('./app');
const { migrate } = require('./db/migrate');

const port = Number(process.env.API_PORT || 3100);

migrate();
const app = createApp();

app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
});

