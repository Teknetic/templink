import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH || join(__dirname, '../data/links.db');

// Ensure data directory exists
const dataDir = dirname(dbPath);
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

// Initialize SQL.js
const SQL = await initSqlJs();
let db;

// Load or create database
if (existsSync(dbPath)) {
  const buffer = readFileSync(dbPath);
  db = new SQL.Database(buffer);
} else {
  db = new SQL.Database();
}

// Initialize database schema
db.run(`
  CREATE TABLE IF NOT EXISTS links (
    id TEXT PRIMARY KEY,
    original_url TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER,
    max_views INTEGER,
    current_views INTEGER DEFAULT 0,
    password_hash TEXT,
    custom_slug TEXT UNIQUE,
    creator_ip TEXT,
    is_active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    link_id TEXT NOT NULL,
    accessed_at INTEGER NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    referer TEXT,
    FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_links_custom_slug ON links(custom_slug);
  CREATE INDEX IF NOT EXISTS idx_links_created_at ON links(created_at);
  CREATE INDEX IF NOT EXISTS idx_analytics_link_id ON analytics(link_id);
  CREATE INDEX IF NOT EXISTS idx_analytics_accessed_at ON analytics(accessed_at);
`);

// Save database to disk
export const saveDatabase = () => {
  const data = db.export();
  const buffer = Buffer.from(data);
  writeFileSync(dbPath, buffer);
};

// Auto-save every 5 seconds
setInterval(saveDatabase, 5000);

// Save on process exit
process.on('SIGINT', () => {
  saveDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  saveDatabase();
  process.exit(0);
});

// Wrapper for prepared statements to mimic better-sqlite3 API
export const prepare = (sql) => {
  return {
    run: (...params) => {
      db.run(sql, params);
      saveDatabase();
      return { changes: db.getRowsModified() };
    },
    get: (...params) => {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      const result = stmt.step() ? stmt.getAsObject() : null;
      stmt.free();
      return result;
    },
    all: (...params) => {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      return results;
    }
  };
};

export default { prepare, saveDatabase };
