const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

let db;

function getDb() {
    if (db) return db;

    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = path.join(dataDir, 'prezgen.sqlite');
    db = new Database(dbPath);
    db.pragma('foreign_keys = ON');
    return db;
}

module.exports = { getDb };

