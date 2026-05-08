# Social Account Checker API

Lightweight Node.js + Express API that checks social media account information across multiple platforms.

## Architecture

Single Express server with a plugin-based platform system. Each platform is a self-contained module implementing a common interface. The router discovers and registers platforms dynamically from a `platforms/` directory — adding a new platform means dropping in a new file, no router changes needed.

```
src/
├── index.js                # Entry point, starts server
├── routes/
│   └── check.js            # GET /api/check/:platform/:username
├── platforms/
│   ├── index.js            # Platform registry (auto-loads all platforms)
│   ├── tiktok.js           # TikTok checker module
│   ├── instagram.js        # Instagram checker module
│   ├── twitter.js          # Twitter/X checker module
│   └── youtube.js          # YouTube checker module
└── utils/
    └── errors.js           # Custom error classes
```

## Route

```
GET /api/check/:platform/:username
```

Examples:
- `GET /api/check/tiktok/taufik.hidayat.dev`
- `GET /api/check/instagram/taufik.hidayat.dev`
- `GET /api/check/twitter/taufik.hidayat.dev`
- `GET /api/check/youtube/taufik.hidayat.dev`

## Platform Interface

Every platform module exports:

```js
module.exports = {
  name: 'tiktok',           // URL-safe identifier (matches :platform param)
  label: 'TikTok',          // Display name
  check(username) { ... }   // Async function, returns normalized response
}
```

### Adding a new platform

1. Create `src/platforms/<name>.js`
2. Export `name`, `label`, and `check(username)`
3. The registry auto-discovers it on next server start

No changes to router, registry config, or any other file.

## Normalized Response

Each platform's `check()` returns the same shape. Fields beyond the core set go into `extras` — this keeps the response extensible without breaking the contract.

```json
{
  "id": "taufik.hidayat.dev",
  "platform": "tiktok",
  "username": "Taufik Hidayat",
  "avatar": "https://...",
  "verified": false,
  "exists": true,
  "stats": {
    "followers": 9734,
    "following": 202,
    "likes": 326,
    "posts": 15
  },
  "extras": {
    "videos": 15,
    "bio": "Developer"
  },
  "raw": { }
}
```

- `stats` — Normalized field names: `followers`, `following`, `likes`, `posts`. Present on all platforms, `null` if unavailable.
- `extras` — Platform-specific fields that don't map to the core stats. Free-form key-value. This is where new variables go without changing the interface.
- `raw` — Full platform-specific response for debugging or advanced use.

### Extensibility

To add new normalized fields later:
1. Add the field to the core response shape in the platform module's `check()` return
2. Other platforms return `null` for that field if they don't support it
3. Platform-specific data that doesn't fit the core shape goes in `extras`

## Platform Implementations

### TikTok
- Scrape public profile page HTML
- Parse user data from `__UNIVERSAL_DATA_FOR_REHYDRATION__` JSON blob embedded in the page
- No API key required

### Instagram
- Scrape public profile page
- Extract data from meta tags or `window._sharedData`
- No API key required (public profiles only)

### Twitter/X
- Use public embed/oembed endpoint or scrape profile page
- No API key required for basic checks

### YouTube
- Use public channel page or oEmbed API
- No API key required for basic checks

Each module handles its own HTTP fetching, parsing, and error handling independently. Dependencies (like `axios` or `cheerio`) are shared at the project level.

## API Response Envelope

**Success:**
```json
{
  "success": true,
  "platform": "tiktok",
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "PLATFORM_NOT_FOUND",
    "message": "Platform 'snapchat' is not supported",
    "supportedPlatforms": ["tiktok", "instagram", "twitter", "youtube"]
  }
}
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `MISSING_USERNAME` | 400 | No username provided |
| `INVALID_PLATFORM` | 400 | Platform not in registry |
| `ACCOUNT_NOT_FOUND` | 404 | Username doesn't exist on platform |
| `RATE_LIMITED` | 429 | Target platform rate limited the request |
| `PLATFORM_ERROR` | 502 | Target platform returned unexpected data |
| `PLATFORM_UNAVAILABLE` | 503 | Target platform temporarily down |

## Dependencies

- `express` — HTTP server
- `axios` — HTTP client for fetching platform pages
- `cheerio` — HTML parsing (lightweight jQuery-like API)

## Configuration

Environment variables (with defaults):

- `PORT` — Server port (default: `3000`)
- `NODE_ENV` — Environment (default: `development`)
- `REQUEST_TIMEOUT` — HTTP request timeout in ms (default: `10000`)
