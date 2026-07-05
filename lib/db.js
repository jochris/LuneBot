import { Database } from 'bun:sqlite';
import fs from 'fs';
import path from 'path';

const DB_PATH = './database/store.db';

const sessionDir = path.dirname(DB_PATH);
if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
}

export const db = new Database(DB_PATH);
db.run('PRAGMA journal_mode = WAL;');
db.run('PRAGMA busy_timeout = 5000;');

db.run(`
    CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        name TEXT,
        verifiedName TEXT
    )
`);

db.run(`
    CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY,
        subject TEXT,
        owner TEXT,
        desc TEXT
    )
`);

db.run(`
    CREATE TABLE IF NOT EXISTS group_participants (
        groupId TEXT,
        jid TEXT,
        admin TEXT,
        PRIMARY KEY (groupId, jid),
        FOREIGN KEY (groupId) REFERENCES groups(id) ON DELETE CASCADE
    )
`);

db.run(`
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )
`);

db.run(`
    CREATE TABLE IF NOT EXISTS sticker_packs (
        name TEXT PRIMARY KEY,
        publisher TEXT,
        description TEXT,
        cover BLOB
    )
`);

db.run(`
    CREATE TABLE IF NOT EXISTS sticker_pack_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pack_name TEXT,
        data BLOB,
        emojis TEXT,
        FOREIGN KEY (pack_name) REFERENCES sticker_packs(name) ON DELETE CASCADE
    )
`);

export default db;
