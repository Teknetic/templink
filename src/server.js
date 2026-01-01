import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as linkService from './linkService.js';
import * as authService from './authService.js';
import { requireAuth, optionalAuth } from './authMiddleware.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow inline scripts for our simple frontend
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests, please try again later.'
});
app.use('/api/', limiter);

// Serve static files
app.use(express.static(join(__dirname, '../public')));

// Helper to get client IP
const getClientIp = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0] ||
         req.socket.remoteAddress ||
         'unknown';
};

// API Routes

// Authentication Routes

// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await authService.registerUser({ email, password, name });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await authService.loginUser({ email, password });
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// Get current user profile
app.get('/api/auth/me', requireAuth, (req, res) => {
  try {
    const user = authService.getUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const stats = authService.getUserStats(req.user.userId);
    res.json({ ...user, stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Request password reset
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    await authService.requestPasswordReset(email);
    res.json({ success: true, message: 'If that email exists, a reset link has been sent' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset password with token
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    const result = await authService.resetPassword(token, password);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Verify email
app.get('/api/auth/verify-email', (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const result = authService.verifyEmail(token);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Request email verification (resend)
app.post('/api/auth/resend-verification', requireAuth, async (req, res) => {
  try {
    const result = await authService.requestEmailVerification(req.user.userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Change password (when logged in)
app.post('/api/auth/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    const result = await authService.changePassword(req.user.userId, currentPassword, newPassword);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update profile
app.put('/api/auth/profile', requireAuth, (req, res) => {
  try {
    const { name, email } = req.body;
    const result = authService.updateUserProfile(req.user.userId, { name, email });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete account
app.delete('/api/auth/account', requireAuth, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const result = await authService.deleteAccount(req.user.userId, password);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Link Management Routes

// Create short link
app.post('/api/links', async (req, res) => {
  try {
    console.log('Received request body:', req.body);
    const { url, expiresIn, maxViews, password, customSlug } = req.body;

    if (!url) {
      console.log('Error: URL is required');
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log('Creating link...');

    // Parse and validate numeric fields, ensure null instead of undefined/NaN
    const parsedExpiresIn = expiresIn ? parseInt(expiresIn, 10) : null;
    const parsedMaxViews = maxViews ? parseInt(maxViews, 10) : null;

    const link = await linkService.createLink({
      originalUrl: url,
      expiresIn: (parsedExpiresIn && !isNaN(parsedExpiresIn)) ? parsedExpiresIn : null,
      maxViews: (parsedMaxViews && !isNaN(parsedMaxViews)) ? parsedMaxViews : null,
      password: password || null,
      customSlug: customSlug || null,
      creatorIp: getClientIp(req)
    });

    console.log('Link created:', link);
    res.json(link);
  } catch (error) {
    console.error('Error creating link:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get link analytics
app.get('/api/links/:id/analytics', (req, res) => {
  try {
    const analytics = linkService.getLinkAnalytics(req.params.id);

    if (!analytics) {
      return res.status(404).json({ error: 'Link not found' });
    }

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get recent links (for demo/admin)
app.get('/api/links', (req, res) => {
  try {
    const links = linkService.getRecentLinks(20);
    res.json(links);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Redirect handler
app.get('/:id', async (req, res) => {
  try {
    const link = linkService.getLink(req.params.id);

    if (!link) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Link Not Found</title></head>
        <body style="font-family: system-ui; text-align: center; padding: 50px;">
          <h1>404 - Link Not Found</h1>
          <p>This link doesn't exist or has expired.</p>
          <a href="/">Create a new link</a>
        </body>
        </html>
      `);
    }

    // Check if link is valid
    if (!linkService.isLinkValid(link)) {
      linkService.deactivateLink(link.id);
      return res.status(410).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Link Expired</title></head>
        <body style="font-family: system-ui; text-align: center; padding: 50px;">
          <h1>Link Expired</h1>
          <p>This link has expired or reached its view limit.</p>
          <a href="/">Create a new link</a>
        </body>
        </html>
      `);
    }

    // Check password
    if (link.password_hash) {
      const password = req.query.password;

      if (!password) {
        return res.status(401).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Password Required</title>
            <style>
              body { font-family: system-ui; text-align: center; padding: 50px; background: #f5f5f5; }
              .container { background: white; padding: 40px; border-radius: 10px; max-width: 400px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              input { padding: 12px; width: 100%; margin: 10px 0; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box; }
              button { padding: 12px 30px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; }
              button:hover { background: #0056b3; }
              .error { color: #dc3545; margin: 10px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2>🔒 Password Protected Link</h2>
              <p>This link requires a password to access.</p>
              <form method="get">
                <input type="password" name="password" placeholder="Enter password" required autofocus>
                <button type="submit">Access Link</button>
              </form>
            </div>
          </body>
          </html>
        `);
      }

      const isValid = await linkService.validatePassword(link, password);
      if (!isValid) {
        return res.status(401).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Invalid Password</title>
            <style>
              body { font-family: system-ui; text-align: center; padding: 50px; background: #f5f5f5; }
              .container { background: white; padding: 40px; border-radius: 10px; max-width: 400px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              input { padding: 12px; width: 100%; margin: 10px 0; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box; }
              button { padding: 12px 30px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; }
              button:hover { background: #0056b3; }
              .error { color: #dc3545; margin: 10px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2>🔒 Password Protected Link</h2>
              <p class="error">Incorrect password. Please try again.</p>
              <form method="get">
                <input type="password" name="password" placeholder="Enter password" required autofocus>
                <button type="submit">Access Link</button>
              </form>
            </div>
          </body>
          </html>
        `);
      }
    }

    // Record analytics
    linkService.recordAnalytics(link.id, {
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'],
      referer: req.headers['referer']
    });

    // Increment view count
    linkService.incrementViews(link.id);

    // Check if this was the last view
    if (link.max_views && link.current_views + 1 >= link.max_views) {
      linkService.deactivateLink(link.id);
    }

    // Redirect
    res.redirect(link.original_url);
  } catch (error) {
    console.error('Redirect error:', error);
    res.status(500).send('Internal server error');
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(`🚀 TempLink server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
});
