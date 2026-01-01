import { nanoid } from 'nanoid';
import bcrypt from 'bcrypt';
import db from './database.js';

const SALT_ROUNDS = 10;

export const createLink = async ({
  originalUrl,
  expiresIn,
  maxViews,
  password,
  customSlug,
  creatorIp
}) => {
  // Validate URL
  try {
    new URL(originalUrl);
  } catch {
    throw new Error('Invalid URL format');
  }

  // Generate or validate slug
  const id = customSlug || nanoid(8);

  if (customSlug) {
    const existing = db.prepare('SELECT id FROM links WHERE custom_slug = ?').get(customSlug);
    if (existing) {
      throw new Error('Custom slug already taken');
    }
  }

  const createdAt = Date.now();
  let expiresAt = null;

  if (expiresIn) {
    expiresAt = createdAt + expiresIn * 1000;
  }

  let passwordHash = null;
  if (password) {
    passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  }

  const stmt = db.prepare(`
    INSERT INTO links (id, original_url, created_at, expires_at, max_views, password_hash, custom_slug, creator_ip)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Ensure no undefined values are passed to sql.js
  stmt.run(
    id,
    originalUrl,
    createdAt,
    expiresAt ?? null,
    maxViews ?? null,
    passwordHash ?? null,
    customSlug ?? null,
    creatorIp ?? null
  );

  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  return {
    id,
    shortUrl: `${baseUrl}/${id}`,
    originalUrl,
    createdAt,
    expiresAt,
    maxViews,
    hasPassword: !!password
  };
};

export const getLink = (id) => {
  const stmt = db.prepare(`
    SELECT * FROM links WHERE (id = ? OR custom_slug = ?) AND is_active = 1
  `);
  return stmt.get(id, id);
};

export const validatePassword = async (link, password) => {
  if (!link.password_hash) return true;
  if (!password) return false;
  return await bcrypt.compare(password, link.password_hash);
};

export const incrementViews = (id) => {
  const stmt = db.prepare(`
    UPDATE links SET current_views = current_views + 1 WHERE id = ?
  `);
  stmt.run(id);
};

export const deactivateLink = (id) => {
  const stmt = db.prepare(`
    UPDATE links SET is_active = 0 WHERE id = ?
  `);
  stmt.run(id);
};

export const isLinkValid = (link) => {
  if (!link.is_active) return false;

  // Check expiration
  if (link.expires_at && Date.now() > link.expires_at) {
    return false;
  }

  // Check max views
  if (link.max_views && link.current_views >= link.max_views) {
    return false;
  }

  return true;
};

export const recordAnalytics = (linkId, { ip, userAgent, referer }) => {
  const stmt = db.prepare(`
    INSERT INTO analytics (link_id, accessed_at, ip_address, user_agent, referer)
    VALUES (?, ?, ?, ?, ?)
  `);
  // Ensure no undefined values are passed to sql.js
  stmt.run(
    linkId,
    Date.now(),
    ip ?? null,
    userAgent ?? null,
    referer ?? null
  );
};

export const getLinkAnalytics = (id) => {
  const link = db.prepare('SELECT * FROM links WHERE id = ?').get(id);

  if (!link) return null;

  const analytics = db.prepare(`
    SELECT
      accessed_at,
      ip_address,
      user_agent,
      referer
    FROM analytics
    WHERE link_id = ?
    ORDER BY accessed_at DESC
    LIMIT 100
  `).all(id);

  const stats = {
    totalViews: link.current_views,
    maxViews: link.max_views,
    remainingViews: link.max_views ? link.max_views - link.current_views : null,
    createdAt: link.created_at,
    expiresAt: link.expires_at,
    isActive: link.is_active === 1,
    originalUrl: link.original_url,
    recentVisits: analytics
  };

  return stats;
};

export const getRecentLinks = (limit = 10) => {
  const stmt = db.prepare(`
    SELECT id, original_url, created_at, expires_at, max_views, current_views, is_active
    FROM links
    ORDER BY created_at DESC
    LIMIT ?
  `);
  return stmt.all(limit);
};
