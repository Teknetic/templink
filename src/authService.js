import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import db from './database.js';
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } from './emailService.js';

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const JWT_EXPIRES_IN = '7d'; // Token valid for 7 days

// Initialize users table
const initUsersTable = () => {
  try {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT,
        plan TEXT DEFAULT 'free',
        email_verified INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        last_login INTEGER,
        is_active INTEGER DEFAULT 1
      )
    `).run();

    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `).run();

    // Create tokens table for verification and password reset
    db.prepare(`
      CREATE TABLE IF NOT EXISTS tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        used INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `).run();

    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_tokens_token ON tokens(token);
      CREATE INDEX IF NOT EXISTS idx_tokens_user_id ON tokens(user_id)
    `).run();

    console.log('✅ Users and tokens tables initialized');
  } catch (error) {
    console.error('Error initializing tables:', error);
  }
};

// Initialize table on module load
initUsersTable();

// Generate unique user ID
const generateUserId = () => {
  return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

// Register new user
export const registerUser = async ({ email, password, name }) => {
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }

  // Validate password strength
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  // Check if user already exists
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    throw new Error('Email already registered');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Create user
  const userId = generateUserId();
  const createdAt = Date.now();

  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, created_at, plan)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, email, passwordHash, name ?? null, createdAt, 'free');

  // Generate JWT token
  const token = jwt.sign(
    { userId, email, plan: 'free' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return {
    user: {
      id: userId,
      email,
      name,
      plan: 'free',
      createdAt
    },
    token
  };
};

// Login user
export const loginUser = async ({ email, password }) => {
  // Find user
  const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(email);

  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Verify password
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    throw new Error('Invalid email or password');
  }

  // Update last login
  db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(Date.now(), user.id);

  // Generate JWT token
  const token = jwt.sign(
    { userId: user.id, email: user.email, plan: user.plan },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      createdAt: user.created_at
    },
    token
  };
};

// Verify JWT token
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

// Get user by ID
export const getUserById = (userId) => {
  const user = db.prepare('SELECT id, email, name, plan, created_at FROM users WHERE id = ? AND is_active = 1').get(userId);
  return user || null;
};

// Update user plan (for Stripe integration later)
export const updateUserPlan = (userId, plan) => {
  db.prepare('UPDATE users SET plan = ? WHERE id = ?').run(plan, userId);
};

// Get user statistics
export const getUserStats = (userId) => {
  const linkCount = db.prepare('SELECT COUNT(*) as count FROM links WHERE creator_ip = ?').get(userId);
  const totalViews = db.prepare('SELECT SUM(current_views) as total FROM links WHERE creator_ip = ?').get(userId);

  return {
    totalLinks: linkCount?.count || 0,
    totalViews: totalViews?.total || 0
  };
};
