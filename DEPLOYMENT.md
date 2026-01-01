# TempLink - Production Deployment Guide

## 🚀 Deployment Options (Easiest to Advanced)

### Option 1: Railway.app (Recommended for Beginners)
**Pros**: Free tier, auto-deployments, built-in PostgreSQL, zero config
**Cost**: Free (500 hours/month) or $5/month

**Steps:**
1. Create account at [railway.app](https://railway.app)
2. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```
3. Login and deploy:
   ```bash
   railway login
   railway init
   railway up
   ```
4. Add PostgreSQL database:
   ```bash
   railway add postgresql
   ```
5. Railway will provide a public URL automatically!

---

### Option 2: Render.com (Simple & Reliable)
**Pros**: Free tier, automatic SSL, easy database
**Cost**: Free or $7/month

**Steps:**
1. Create account at [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repo (or upload code)
4. Configure:
   - Build: `npm install`
   - Start: `npm start`
   - Add PostgreSQL database (free)
5. Deploy! Render handles SSL automatically

---

### Option 3: DigitalOcean App Platform
**Pros**: Professional grade, scalable
**Cost**: $5/month + database

**Steps:**
1. Create [DigitalOcean](https://digitalocean.com) account
2. Apps → Create App
3. Connect repo or upload
4. Add managed PostgreSQL database ($15/month or use SQLite)
5. Configure environment variables
6. Deploy with custom domain

---

### Option 4: AWS / Google Cloud / Azure (Enterprise)
**Pros**: Maximum scalability, full control
**Cost**: Pay-as-you-go (starts ~$10-20/month)

**Best for**: High traffic, enterprise needs

---

## 📦 Pre-Deployment Checklist

### 1. Upgrade to Production Database

SQLite (sql.js) is fine for development but **not recommended for production**. Upgrade to PostgreSQL:

**Install PostgreSQL driver:**
```bash
npm install pg
```

**Update `src/database.js`:**
```javascript
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Create tables
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
`);

export const prepare = (sql) => ({
  run: async (...params) => {
    await pool.query(sql, params);
  },
  get: async (...params) => {
    const result = await pool.query(sql, params);
    return result.rows[0] || null;
  },
  all: async (...params) => {
    const result = await pool.query(sql, params);
    return result.rows;
  }
});

export default { prepare };
```

**Update linkService.js** to use `await` for all database calls:
```javascript
const stmt = db.prepare('SELECT * FROM links WHERE id = ?');
const link = await stmt.get(id); // Add await!
```

---

### 2. Environment Configuration

Create production `.env`:
```env
NODE_ENV=production
PORT=3000
BASE_URL=https://yourdomain.com
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Security
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=50

# Optional: Custom port
# PORT=8080
```

---

### 3. Security Hardening

**Add to package.json:**
```json
{
  "engines": {
    "node": ">=18.0.0"
  }
}
```

**Update `src/server.js`:**
```javascript
// Stricter rate limiting for production
const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW || 15 * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX || 50,
  message: 'Too many requests from this IP'
});

// Apply to all routes
app.use(limiter);

// Trust proxy (important for Railway, Render, etc.)
app.set('trust proxy', 1);

// Add request logging in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}
```

---

## 🌐 Custom Domain Setup

### 1. Get a Domain
- Namecheap: ~$10/year
- Google Domains: ~$12/year
- Cloudflare: ~$10/year

### 2. Configure DNS
Point your domain to deployment platform:

**Railway/Render:**
- Add CNAME record: `www` → `your-app.railway.app`
- Add A record: `@` → Platform IP

**Cloudflare (Recommended):**
- Free SSL/CDN
- DDoS protection
- Analytics

### 3. SSL Certificate
All platforms provide **free SSL** automatically!

---

## 📊 Monitoring & Analytics

### Add Health Monitoring

**Install UptimeRobot (Free):**
- Monitors your service 24/7
- Alerts via email/SMS if down
- Setup: [uptimerobot.com](https://uptimerobot.com)

### Application Monitoring

**Option A: LogTail (Free tier)**
```bash
npm install @logtail/node
```

```javascript
import { Logtail } from '@logtail/node';
const logtail = new Logtail(process.env.LOGTAIL_TOKEN);

app.use((req, res, next) => {
  logtail.info('Request', { method: req.method, path: req.path });
  next();
});
```

**Option B: Sentry (Error tracking)**
```bash
npm install @sentry/node
```

---

## 🔥 Performance Optimization

### 1. Add Compression
```bash
npm install compression
```

```javascript
import compression from 'compression';
app.use(compression());
```

### 2. Add Caching Headers
```javascript
// Cache static files for 1 day
app.use(express.static('public', {
  maxAge: '1d',
  etag: true
}));
```

### 3. Database Connection Pooling
Already included in PostgreSQL setup above!

### 4. Add Redis for Session Storage (Optional)
```bash
npm install redis
```

For high-traffic sites, cache link lookups in Redis.

---

## 📈 Scaling Strategy

### Phase 1: Single Server (0-10k requests/day)
- Railway/Render free tier
- PostgreSQL
- Current setup works fine

### Phase 2: Horizontal Scaling (10k-100k requests/day)
- Add Redis for caching
- Multiple server instances (load balancing)
- CDN for static assets (Cloudflare)

### Phase 3: Enterprise (100k+ requests/day)
- Kubernetes cluster
- Separate database server
- Read replicas
- Geographic distribution

---

## 💰 Cost Breakdown

### Minimal Setup ($0-7/month)
- **Hosting**: Railway/Render free tier
- **Domain**: $10/year (~$1/month)
- **Database**: Included free
- **SSL**: Free
- **Total**: ~$1-7/month

### Professional Setup ($20-30/month)
- **Hosting**: Render Pro ($7/month)
- **Database**: Managed PostgreSQL ($15/month)
- **Domain**: $10/year
- **Monitoring**: Free tier
- **CDN**: Cloudflare free
- **Total**: ~$23/month

### High-Traffic Setup ($100+/month)
- **Hosting**: DigitalOcean Droplet ($24/month)
- **Database**: Managed DB ($15/month)
- **Redis**: $10/month
- **Backups**: $5/month
- **CDN**: Cloudflare Pro ($20/month)
- **Total**: ~$74/month

---

## 🚢 Quick Deploy Commands

### Deploy to Railway (Fastest)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway add postgresql
railway up

# Set environment variables
railway variables set BASE_URL=https://your-app.railway.app
railway variables set NODE_ENV=production

# Done! Your app is live
```

### Deploy to Render
```bash
# No CLI needed - use web interface
1. Go to render.com
2. New Web Service
3. Connect GitHub
4. Deploy!
```

---

## 🔒 Security Best Practices

1. **Environment Variables**: Never commit `.env` to Git
2. **Rate Limiting**: Already implemented ✅
3. **Input Validation**: Already implemented ✅
4. **SQL Injection**: Using parameterized queries ✅
5. **XSS Protection**: Helmet.js enabled ✅
6. **HTTPS**: Enforced by platforms ✅

**Additional hardening:**
```javascript
// Add to server.js
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));
```

---

## 📱 Make it a Progressive Web App (PWA)

Add `public/manifest.json`:
```json
{
  "name": "TempLink",
  "short_name": "TempLink",
  "description": "Smart link shortener with expiration",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#667eea",
  "theme_color": "#667eea",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

---

## 🎯 Marketing Your Service

1. **Product Hunt** - Launch announcement
2. **Reddit** - r/SideProject, r/webdev
3. **Hacker News** - Show HN post
4. **Twitter/X** - Share with #buildinpublic
5. **Dev.to** - Write a technical article

---

## 📦 Backup Strategy

**Automatic Backups:**
- Railway/Render: Automatic daily backups
- DigitalOcean: Enable automated backups ($1.20/month)

**Manual Backup:**
```bash
# Export database
pg_dump $DATABASE_URL > backup.sql

# Restore
psql $DATABASE_URL < backup.sql
```

---

## 🎉 You're Ready for Production!

### Recommended Quick Start:
1. ✅ Deploy to **Railway** (easiest)
2. ✅ Use **PostgreSQL** database
3. ✅ Add custom domain via **Cloudflare**
4. ✅ Monitor with **UptimeRobot**
5. ✅ Scale as needed

**Your app will be live in 15 minutes!** 🚀

---

## Need Help?

- Railway Discord: [discord.gg/railway](https://discord.gg/railway)
- Render Docs: [render.com/docs](https://render.com/docs)
- Stack Overflow: Tag `nodejs` + `deployment`

Good luck with your launch! 🎊
