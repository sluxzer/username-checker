# Social Account Checker API

Lightweight API to check social media account information across multiple platforms.

## Quick Start

```bash
npm install
npm start
```

Server runs on `http://localhost:3000` (or set `PORT` env var).

## API

### List supported platforms

```
GET /api/check
```

### Check an account

```
GET /api/check/:platform/:username
```

**Examples:**

```bash
curl http://localhost:3000/api/check/tiktok/taufik.hidayat.dev
curl http://localhost:3000/api/check/instagram/nasa
curl http://localhost:3000/api/check/twitter/elonmusk
curl http://localhost:3000/api/check/youtube/@MrBeast
```

### Response

```json
{
  "success": true,
  "platform": "tiktok",
  "data": {
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
      "posts": 16
    },
    "extras": {
      "bio": "Software Engineer & Founder"
    },
    "raw": { }
  }
}
```

### Errors

| Code | Status | Description |
|------|--------|-------------|
| `MISSING_USERNAME` | 400 | No username provided |
| `INVALID_PLATFORM` | 400 | Platform not supported |
| `ACCOUNT_NOT_FOUND` | 404 | Username not found |
| `RATE_LIMITED` | 429 | Target platform rate limited |
| `PLATFORM_ERROR` | 502 | Unexpected platform response |

## Supported Platforms

| Platform | Method |
|----------|--------|
| TikTok | Profile page scraping |
| Instagram | Meta tag extraction |
| Twitter/X | OG meta scraping |
| YouTube | Channel page scraping |

## Adding a Platform

Drop a file in `src/platforms/`:

```js
// src/platforms/snapchat.js
module.exports = {
  name: 'snapchat',
  label: 'Snapchat',
  async check(username) {
    // fetch and return normalized data
    return {
      id: username,
      platform: 'snapchat',
      username: null,
      avatar: null,
      verified: false,
      exists: true,
      stats: { followers: null, following: null, likes: null, posts: null },
      extras: {},
      raw: null,
    };
  }
};
```

No other changes needed — the registry auto-discovers it.

## Testing

```bash
npm test
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `REQUEST_TIMEOUT` | `10000` | HTTP request timeout (ms) |
