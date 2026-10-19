require('dotenv').config();
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.resolve(process.env.DB_PATH || './db/canteen.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Bring an older database up to date (adds new columns/statuses; does nothing on a new one).
require('../db/migrate').migrate(db);

module.exports = db;
