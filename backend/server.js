const { createApp } = require('./app');
const { migrate } = require('./db/migrate');
const { config } = require('./config');

migrate();
const app = createApp();

app.listen(config.apiPort, () => {
    console.log(`API listening on http://localhost:${config.apiPort}`);
});

