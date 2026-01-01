# TempLink - Smart Link Shortener

A modern, feature-rich URL shortener with expiration, password protection, view limits, and analytics tracking.

## Features

- **Smart Expiration**: Set links to expire after a specific time period
- **View Limits**: Restrict how many times a link can be accessed
- **Password Protection**: Secure links with password authentication
- **Custom Slugs**: Create memorable short codes
- **Analytics Dashboard**: Track clicks, referrers, user agents, and access patterns
- **Rate Limiting**: Built-in protection against abuse
- **Security**: Helmet.js, CORS, bcrypt password hashing
- **Modern Stack**: Express + SQLite + Vanilla JS frontend

## Quick Start

### Prerequisites

- Node.js 18+ (for native `--watch` flag support)
- npm or yarn

### Installation

1. Clone or navigate to the project directory:
```bash
cd CREATE
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment (optional):
Edit `.env` file to customize:
```env
PORT=3000
BASE_URL=http://localhost:3000
DATABASE_PATH=./data/links.db
NODE_ENV=development
```

4. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

5. Open your browser:
```
http://localhost:3000
```

## API Reference

### Create a Short Link

**POST** `/api/links`

Request body:
```json
{
  "url": "https://example.com/very/long/url",
  "expiresIn": 3600,
  "maxViews": 10,
  "password": "secret123",
  "customSlug": "my-link"
}
```

All fields except `url` are optional.

Response:
```json
{
  "id": "abc12345",
  "shortUrl": "http://localhost:3000/abc12345",
  "originalUrl": "https://example.com/very/long/url",
  "createdAt": 1704067200000,
  "expiresAt": 1704070800000,
  "maxViews": 10,
  "hasPassword": true
}
```

### Get Link Analytics

**GET** `/api/links/:id/analytics`

Response:
```json
{
  "totalViews": 5,
  "maxViews": 10,
  "remainingViews": 5,
  "createdAt": 1704067200000,
  "expiresAt": 1704070800000,
  "isActive": true,
  "originalUrl": "https://example.com/very/long/url",
  "recentVisits": [
    {
      "accessed_at": 1704067300000,
      "ip_address": "192.168.1.1",
      "user_agent": "Mozilla/5.0...",
      "referer": "https://google.com"
    }
  ]
}
```

### Access a Short Link

**GET** `/:id`

Query parameters:
- `password` (optional): Required if link is password-protected

Redirects to the original URL or shows password prompt/error page.

### List Recent Links

**GET** `/api/links`

Returns the 20 most recently created links.

## Use Cases

1. **Temporary Sharing**: Share interview feedback links that expire after 24 hours
2. **Limited Access**: Create survey links that stop working after 100 responses
3. **Secure Distribution**: Password-protect sensitive documents
4. **Marketing Campaigns**: Track click analytics for social media campaigns
5. **Event Registration**: Create links that expire when event registration closes

## Architecture

### Tech Stack
- **Backend**: Node.js + Express.js
- **Database**: SQLite with better-sqlite3 (synchronous, high-performance)
- **Security**: Helmet.js, bcrypt, express-rate-limit, CORS
- **Frontend**: Vanilla JavaScript, CSS Grid/Flexbox

### Project Structure
```
CREATE/
├── src/
│   ├── server.js        # Express server & routes
│   ├── database.js      # Database initialization & schema
│   └── linkService.js   # Business logic for links & analytics
├── public/
│   └── index.html       # Frontend UI
├── data/
│   └── links.db         # SQLite database (auto-created)
├── .env                 # Environment configuration
└── package.json         # Dependencies & scripts
```

### Database Schema

**links** table:
- `id`: Unique short code
- `original_url`: The destination URL
- `created_at`: Timestamp
- `expires_at`: Optional expiration timestamp
- `max_views`: Optional view limit
- `current_views`: View counter
- `password_hash`: bcrypt hashed password (optional)
- `custom_slug`: User-defined short code (optional)
- `is_active`: Boolean flag

**analytics** table:
- `link_id`: Foreign key to links
- `accessed_at`: Timestamp
- `ip_address`: Visitor IP
- `user_agent`: Browser info
- `referer`: Traffic source

## Security Considerations

- Passwords are hashed using bcrypt with 10 salt rounds
- Rate limiting: 100 requests per 15 minutes per IP
- Helmet.js provides security headers
- Input validation on all endpoints
- No SQL injection (using parameterized queries)
- CORS enabled for API flexibility

## Performance

- SQLite WAL mode for better concurrency
- Indexed columns for fast lookups
- Synchronous database operations (no callback hell)
- Minimal dependencies

## Deployment

### Production Checklist

1. Update `.env` with production values:
```env
PORT=3000
BASE_URL=https://yourdomain.com
NODE_ENV=production
```

2. Use a process manager:
```bash
npm install -g pm2
pm2 start src/server.js --name templink
```

3. Set up reverse proxy (nginx):
```nginx
location / {
  proxy_pass http://localhost:3000;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

4. Consider upgrading to PostgreSQL for multi-server deployments

## Future Enhancements

- QR code generation for short links
- Link preview/metadata scraping
- User accounts and link management
- Batch link creation API
- Webhook notifications on expiration
- Geographic analytics
- Custom domains

## License

MIT

## Contributing

Contributions welcome! This is a demonstration project showcasing modern Node.js best practices.
