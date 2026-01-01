import pg from 'pg';
const { Pool } = pg;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize database schema
const initDatabase = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS links (
      id TEXT PRIMARY KEY,
      original_url TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      expires_at BIGINT,
      max_views INTEGER,
      current_views INTEGER DEFAULT 0,
      password_hash TEXT,
      custom_slug TEXT UNIQUE,
      creator_ip TEXT,
      is_active BOOLEAN DEFAULT true
    );

    CREATE TABLE IF NOT EXISTS analytics (
      id SERIAL PRIMARY KEY,
      link_id TEXT NOT NULL REFERENCES links(id) ON DELETE CASCADE,
      accessed_at BIGINT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      referer TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_links_custom_slug ON links(custom_slug);
    CREATE INDEX IF NOT EXISTS idx_links_created_at ON links(created_at);
    CREATE INDEX IF NOT EXISTS idx_analytics_link_id ON analytics(link_id);
    CREATE INDEX IF NOT EXISTS idx_analytics_accessed_at ON analytics(accessed_at);
  `);

  console.log('✅ Database schema initialized');
};

// Initialize on startup
initDatabase().catch(console.error);

// Wrapper for prepared statements
export const prepare = (sql) => {
  // Convert ? placeholders to $1, $2, etc. for PostgreSQL
  let paramIndex = 0;
  const pgSql = sql.replace(/\?/g, () => `$${++paramIndex}`);

  return {
    run: async (...params) => {
      await pool.query(pgSql, params);
    },
    get: async (...params) => {
      const result = await pool.query(pgSql, params);
      return result.rows[0] || null;
    },
    all: async (...params) => {
      const result = await pool.query(pgSql, params);
      return result.rows;
    }
  };
};

export default { prepare };
