# Social Account Checker API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a lightweight Express API that checks social media account info across TikTok, Instagram, Twitter/X, and YouTube via a plugin-based platform system.

**Architecture:** Single Express server with auto-discovered platform modules. Each platform implements a `check(username)` function returning a normalized response. The router dispatches `GET /api/check/:platform/:username` to the right module.

**Tech Stack:** Node.js, Express, axios, cheerio, Jest

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `src/index.js`
- Create: `.gitignore`

- [ ] **Step 1: Initialize project and install dependencies**

```bash
cd /Users/xavier/Sites/my-project/account-checker
npm init -y
npm install express axios cheerio
npm install -D jest supertest
```

- [ ] **Step 2: Update package.json scripts**

In `package.json`, set the scripts section to:

```json
"scripts": {
  "start": "node src/index.js",
  "dev": "node --watch src/index.js",
  "test": "jest"
}
```

- [ ] **Step 3: Create .gitignore**

```
node_modules/
.env
```

- [ ] **Step 4: Create src/index.js**

```js
const express = require('express');
const checkRoute = require('./routes/check');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/api/check', checkRoute);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Account Checker API running on port ${PORT}`);
});

module.exports = app;
```

- [ ] **Step 5: Verify server starts**

Run: `node src/index.js &` then `curl http://localhost:3000/health`
Expected: `{"status":"ok"}`

- [ ] **Step 6: Commit**

```bash
git init
git add package.json package-lock.json .gitignore src/index.js docs/
git commit -m "feat: scaffold Express project with dependencies"
```

---

### Task 2: Error Utilities

**Files:**
- Create: `src/utils/errors.js`
- Create: `tests/utils/errors.test.js`

- [ ] **Step 1: Write tests for error classes**

```js
// tests/utils/errors.test.js
const { AppError, AccountNotFoundError, RateLimitedError, PlatformError } = require('../../../src/utils/errors');

describe('AppError', () => {
  it('sets code, message, and statusCode', () => {
    const err = new AppError('TEST_CODE', 'test message', 400);
    expect(err.code).toBe('TEST_CODE');
    expect(err.message).toBe('test message');
    expect(err.statusCode).toBe(400);
  });
});

describe('AccountNotFoundError', () => {
  it('sets 404 status', () => {
    const err = new AccountNotFoundError('tiktok', 'nouser');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('ACCOUNT_NOT_FOUND');
  });
});

describe('RateLimitedError', () => {
  it('sets 429 status', () => {
    const err = new RateLimitedError('tiktok');
    expect(err.statusCode).toBe(429);
    expect(err.code).toBe('RATE_LIMITED');
  });
});

describe('PlatformError', () => {
  it('sets 502 status', () => {
    const err = new PlatformError('tiktok', 'bad response');
    expect(err.statusCode).toBe(502);
    expect(err.code).toBe('PLATFORM_ERROR');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/utils/errors.test.js --verbose`
Expected: FAIL — module not found

- [ ] **Step 3: Implement error classes**

```js
// src/utils/errors.js
class AppError extends Error {
  constructor(code, message, statusCode) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

class AccountNotFoundError extends AppError {
  constructor(platform, username) {
    super('ACCOUNT_NOT_FOUND', `Account '${username}' not found on ${platform}`, 404);
  }
}

class RateLimitedError extends AppError {
  constructor(platform) {
    super('RATE_LIMITED', `Rate limited by ${platform}`, 429);
  }
}

class PlatformError extends AppError {
  constructor(platform, detail) {
    super('PLATFORM_ERROR', `${platform}: ${detail}`, 502);
  }
}

class PlatformUnavailableError extends AppError {
  constructor(platform) {
    super('PLATFORM_UNAVAILABLE', `${platform} is temporarily unavailable`, 503);
  }
}

module.exports = { AppError, AccountNotFoundError, RateLimitedError, PlatformError, PlatformUnavailableError };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest tests/utils/errors.test.js --verbose`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/utils/errors.js tests/utils/errors.test.js
git commit -m "feat: add error utility classes"
```

---

### Task 3: Platform Registry

**Files:**
- Create: `src/platforms/index.js`
- Create: `tests/platforms/registry.test.js`

- [ ] **Step 1: Write tests for the platform registry**

```js
// tests/platforms/registry.test.js
const { getPlatform, listPlatforms } = require('../../../src/platforms');

describe('platform registry', () => {
  it('lists all registered platforms', () => {
    const platforms = listPlatforms();
    expect(platforms.length).toBeGreaterThan(0);
    platforms.forEach(p => {
      expect(p).toHaveProperty('name');
      expect(p).toHaveProperty('label');
      expect(p).toHaveProperty('check');
    });
  });

  it('retrieves a platform by name', () => {
    const platform = getPlatform('tiktok');
    expect(platform).not.toBeNull();
    expect(platform.name).toBe('tiktok');
  });

  it('returns null for unknown platform', () => {
    const platform = getPlatform('snapchat');
    expect(platform).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/platforms/registry.test.js --verbose`
Expected: FAIL — module not found

- [ ] **Step 3: Implement platform registry with auto-discovery**

```js
// src/platforms/index.js
const fs = require('fs');
const path = require('path');

const platforms = new Map();

const files = fs.readdirSync(__dirname)
  .filter(f => f !== 'index.js' && f.endsWith('.js'));

for (const file of files) {
  const mod = require(path.join(__dirname, file));
  if (mod.name && mod.check) {
    platforms.set(mod.name, mod);
  }
}

function getPlatform(name) {
  return platforms.get(name) || null;
}

function listPlatforms() {
  return Array.from(platforms.values());
}

module.exports = { getPlatform, listPlatforms };
```

- [ ] **Step 4: Run tests to verify they fail (no platform modules yet)**

Run: `npx jest tests/platforms/registry.test.js --verbose`
Expected: FAIL — listPlatforms returns empty, getPlatform('tiktok') is null

- [ ] **Step 5: Commit**

```bash
git add src/platforms/index.js tests/platforms/registry.test.js
git commit -m "feat: add platform registry with auto-discovery"
```

---

### Task 4: TikTok Platform Module

**Files:**
- Create: `src/platforms/tiktok.js`
- Create: `tests/platforms/tiktok.test.js`

- [ ] **Step 1: Write tests for TikTok module**

```js
// tests/platforms/tiktok.test.js
const { getPlatform } = require('../../../src/platforms');

describe('tiktok platform', () => {
  it('is registered in the platform registry', () => {
    const platform = getPlatform('tiktok');
    expect(platform).not.toBeNull();
    expect(platform.name).toBe('tiktok');
    expect(platform.label).toBe('TikTok');
    expect(typeof platform.check).toBe('function');
  });

  it('returns normalized response for a valid username', async () => {
    const platform = getPlatform('tiktok');
    const result = await platform.check('taufik.hidayat.dev');
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('platform', 'tiktok');
    expect(result).toHaveProperty('username');
    expect(result).toHaveProperty('avatar');
    expect(result).toHaveProperty('verified');
    expect(result).toHaveProperty('exists', true);
    expect(result).toHaveProperty('stats');
    expect(result.stats).toHaveProperty('followers');
    expect(result.stats).toHaveProperty('following');
    expect(result.stats).toHaveProperty('likes');
    expect(result.stats).toHaveProperty('posts');
    expect(result).toHaveProperty('extras');
    expect(result).toHaveProperty('raw');
  });

  it('returns exists=false for an invalid username', async () => {
    const platform = getPlatform('tiktok');
    const result = await platform.check('thisusersurelydoesnotexist123456789xyz');
    expect(result.exists).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/platforms/tiktok.test.js --verbose`
Expected: FAIL — getPlatform('tiktok') is null

- [ ] **Step 3: Implement TikTok platform module**

```js
// src/platforms/tiktok.js
const axios = require('axios');
const cheerio = require('cheerio');
const { AccountNotFoundError, PlatformError } = require('../utils/errors');

const TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '10000', 10);

async function check(username) {
  const url = `https://www.tiktok.com/@${encodeURIComponent(username)}`;

  try {
    const response = await axios.get(url, {
      timeout: TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const html = response.data;
    const $ = cheerio.load(html);

    const scriptSigi = $('script#SIGI_STATE').html();
    const scriptUniversal = html.match(/window\['__UNIVERSAL_DATA_FOR_REHYDRATION__'\]\s*=\s*({.+?})\s*;?\s*<\/script>/s);

    let userData = null;

    if (scriptUniversal) {
      try {
        const json = JSON.parse(scriptUniversal[1]);
        const detailModule = json['__DEFAULT_SCOPE__']['webapp.user-detail'];
        if (detailModule) {
          userData = detailModule.userInfo;
        }
      } catch (e) {
        // fallback below
      }
    }

    if (!userData && scriptSigi) {
      try {
        const json = JSON.parse(scriptSigi);
        const userModule = json['UserModule'];
        if (userModule) {
          userData = userModule.users && Object.values(userModule.users)[0];
        }
      } catch (e) {
        // continue
      }
    }

    if (!userData) {
      return {
        id: username,
        platform: 'tiktok',
        username: null,
        avatar: null,
        verified: false,
        exists: false,
        stats: { followers: null, following: null, likes: null, posts: null },
        extras: {},
        raw: null,
      };
    }

    const user = userData.user || userData;
    const stats = userData.stats || {};

    return {
      id: user.uniqueId || username,
      platform: 'tiktok',
      username: user.nickname || user.uniqueId,
      avatar: user.avatarMedium || user.avatarThumb || null,
      verified: !!user.verified,
      exists: true,
      stats: {
        followers: stats.followerCount ?? null,
        following: stats.followingCount ?? null,
        likes: stats.heartCount ?? null,
        posts: stats.videoCount ?? null,
      },
      extras: {
        bio: user.signature || null,
        createdAt: user.createTime || null,
      },
      raw: userData,
    };
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return {
        id: username,
        platform: 'tiktok',
        username: null,
        avatar: null,
        verified: false,
        exists: false,
        stats: { followers: null, following: null, likes: null, posts: null },
        extras: {},
        raw: null,
      };
    }

    if (err.response && err.response.status === 429) {
      const { RateLimitedError } = require('../utils/errors');
      throw new RateLimitedError('tiktok');
    }

    throw new PlatformError('tiktok', err.message);
  }
}

module.exports = {
  name: 'tiktok',
  label: 'TikTok',
  check,
};
```

- [ ] **Step 4: Run tests**

Run: `npx jest tests/platforms/tiktok.test.js --verbose`
Expected: PASS (3 tests). Note: the valid username test makes a real HTTP call to TikTok — it may be flaky in CI.

- [ ] **Step 5: Commit**

```bash
git add src/platforms/tiktok.js tests/platforms/tiktok.test.js
git commit -m "feat: add TikTok platform module"
```

---

### Task 5: Instagram Platform Module

**Files:**
- Create: `src/platforms/instagram.js`
- Create: `tests/platforms/instagram.test.js`

- [ ] **Step 1: Write tests for Instagram module**

```js
// tests/platforms/instagram.test.js
const { getPlatform } = require('../../../src/platforms');

describe('instagram platform', () => {
  it('is registered in the platform registry', () => {
    const platform = getPlatform('instagram');
    expect(platform).not.toBeNull();
    expect(platform.name).toBe('instagram');
    expect(platform.label).toBe('Instagram');
    expect(typeof platform.check).toBe('function');
  });

  it('returns normalized response for a valid username', async () => {
    const platform = getPlatform('instagram');
    const result = await platform.check('nasa');
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('platform', 'instagram');
    expect(result).toHaveProperty('username');
    expect(result).toHaveProperty('exists', true);
    expect(result).toHaveProperty('stats');
    expect(result.stats).toHaveProperty('followers');
    expect(result.stats).toHaveProperty('following');
    expect(result.stats).toHaveProperty('posts');
  });

  it('returns exists=false for an invalid username', async () => {
    const platform = getPlatform('instagram');
    const result = await platform.check('thisusersurelydoesnotexist123456789xyz');
    expect(result.exists).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/platforms/instagram.test.js --verbose`
Expected: FAIL — getPlatform('instagram') is null

- [ ] **Step 3: Implement Instagram platform module**

```js
// src/platforms/instagram.js
const axios = require('axios');
const cheerio = require('cheerio');
const { AccountNotFoundError, PlatformError, RateLimitedError } = require('../utils/errors');

const TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '10000', 10);

async function check(username) {
  const url = `https://www.instagram.com/${encodeURIComponent(username)}/`;

  try {
    const response = await axios.get(url, {
      timeout: TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Try extracting from meta description
    const metaDesc = $('meta[name="description"]').attr('content') || '';
    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    const ogImage = $('meta[property="og:image"]').attr('content') || '';

    // Parse follower/post counts from meta description
    // Format: "X Followers, Y Following, Z Posts - See Instagram photos and videos from USERNAME (@handle)"
    const followerMatch = metaDesc.match(/(\d[\d,]*\.?\d*[kKmM]?)\s+Followers/i);
    const followingMatch = metaDesc.match(/(\d[\d,]*\.?\d*[kKmM]?)\s+Following/i);
    const postsMatch = metaDesc.match(/(\d[\d,]*\.?\d*[kKmM]?)\s+Posts/i);

    const parseCount = (str) => {
      if (!str) return null;
      const cleaned = str.replace(/,/g, '');
      const lower = cleaned.toLowerCase();
      if (lower.endsWith('k')) return Math.round(parseFloat(lower) * 1000);
      if (lower.endsWith('m')) return Math.round(parseFloat(lower) * 1000000);
      return parseInt(cleaned, 10);
    };

    // If no meta description or it's a login wall, account might not exist or be private
    if (!metaDesc && !ogTitle) {
      return {
        id: username,
        platform: 'instagram',
        username: null,
        avatar: null,
        verified: false,
        exists: false,
        stats: { followers: null, following: null, likes: null, posts: null },
        extras: {},
        raw: null,
      };
    }

    const displayName = ogTitle.replace(/\s*\(@.*\)$/, '').trim() || username;

    return {
      id: username,
      platform: 'instagram',
      username: displayName,
      avatar: ogImage || null,
      verified: false,
      exists: true,
      stats: {
        followers: parseCount(followerMatch ? followerMatch[1] : null),
        following: parseCount(followingMatch ? followingMatch[1] : null),
        likes: null,
        posts: parseCount(postsMatch ? postsMatch[1] : null),
      },
      extras: {
        bio: metaDesc,
      },
      raw: { metaDescription: metaDesc, ogTitle, ogImage },
    };
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return {
        id: username,
        platform: 'instagram',
        username: null,
        avatar: null,
        verified: false,
        exists: false,
        stats: { followers: null, following: null, likes: null, posts: null },
        extras: {},
        raw: null,
      };
    }

    if (err.response && err.response.status === 429) {
      throw new RateLimitedError('instagram');
    }

    throw new PlatformError('instagram', err.message);
  }
}

module.exports = {
  name: 'instagram',
  label: 'Instagram',
  check,
};
```

- [ ] **Step 4: Run tests**

Run: `npx jest tests/platforms/instagram.test.js --verbose`
Expected: PASS (3 tests). Note: real HTTP calls to Instagram.

- [ ] **Step 5: Commit**

```bash
git add src/platforms/instagram.js tests/platforms/instagram.test.js
git commit -m "feat: add Instagram platform module"
```

---

### Task 6: Twitter/X Platform Module

**Files:**
- Create: `src/platforms/twitter.js`
- Create: `tests/platforms/twitter.test.js`

- [ ] **Step 1: Write tests for Twitter/X module**

```js
// tests/platforms/twitter.test.js
const { getPlatform } = require('../../../src/platforms');

describe('twitter platform', () => {
  it('is registered in the platform registry', () => {
    const platform = getPlatform('twitter');
    expect(platform).not.toBeNull();
    expect(platform.name).toBe('twitter');
    expect(platform.label).toBe('Twitter/X');
    expect(typeof platform.check).toBe('function');
  });

  it('returns normalized response for a valid username', async () => {
    const platform = getPlatform('twitter');
    const result = await platform.check('x');
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('platform', 'twitter');
    expect(result).toHaveProperty('username');
    expect(result).toHaveProperty('exists', true);
    expect(result).toHaveProperty('stats');
    expect(result.stats).toHaveProperty('followers');
    expect(result.stats).toHaveProperty('following');
    expect(result.stats).toHaveProperty('posts');
  });

  it('returns exists=false for an invalid username', async () => {
    const platform = getPlatform('twitter');
    const result = await platform.check('thisusersurelydoesnotexist123456789xyz');
    expect(result.exists).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/platforms/twitter.test.js --verbose`
Expected: FAIL — getPlatform('twitter') is null

- [ ] **Step 3: Implement Twitter/X platform module**

```js
// src/platforms/twitter.js
const axios = require('axios');
const cheerio = require('cheerio');
const { PlatformError, RateLimitedError } = require('../utils/errors');

const TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '10000', 10);

async function check(username) {
  const url = `https://x.com/${encodeURIComponent(username)}`;

  try {
    const response = await axios.get(url, {
      timeout: TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const html = response.data;
    const $ = cheerio.load(html);

    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    const ogImage = $('meta[property="og:image"]').attr('content') || '';
    const ogDescription = $('meta[property="og:description"]').attr('content') || '';

    // Check for account not found indicators
    if (ogTitle.includes('Log in') || ogTitle.includes('Sign up') || html.includes('This account doesn')) {
      return {
        id: username,
        platform: 'twitter',
        username: null,
        avatar: null,
        verified: false,
        exists: false,
        stats: { followers: null, following: null, likes: null, posts: null },
        extras: {},
        raw: null,
      };
    }

    // Parse follower/following counts from og:description
    // Format: "X Followers, Y Following" or similar
    const followerMatch = ogDescription.match(/([\d,]+\.?\d*[kKmM]?)\s+Followers/i);
    const followingMatch = ogDescription.match(/([\d,]+\.?\d*[kKmM]?)\s+Following/i);
    const postsMatch = ogDescription.match(/([\d,]+\.?\d*[kKmM]?)\s+Posts/i);

    const parseCount = (str) => {
      if (!str) return null;
      const cleaned = str.replace(/,/g, '');
      const lower = cleaned.toLowerCase();
      if (lower.endsWith('k')) return Math.round(parseFloat(lower) * 1000);
      if (lower.endsWith('m')) return Math.round(parseFloat(lower) * 1000000);
      return parseInt(cleaned, 10);
    };

    const displayName = ogTitle.replace(/\s*\(@.*\)$/, '').trim() || username;

    return {
      id: username,
      platform: 'twitter',
      username: displayName,
      avatar: ogImage || null,
      verified: false,
      exists: true,
      stats: {
        followers: parseCount(followerMatch ? followerMatch[1] : null),
        following: parseCount(followingMatch ? followingMatch[1] : null),
        likes: null,
        posts: parseCount(postsMatch ? postsMatch[1] : null),
      },
      extras: {
        bio: ogDescription,
      },
      raw: { ogTitle, ogImage, ogDescription },
    };
  } catch (err) {
    if (err.response && (err.response.status === 404 || err.response.status === 301)) {
      return {
        id: username,
        platform: 'twitter',
        username: null,
        avatar: null,
        verified: false,
        exists: false,
        stats: { followers: null, following: null, likes: null, posts: null },
        extras: {},
        raw: null,
      };
    }

    if (err.response && err.response.status === 429) {
      throw new RateLimitedError('twitter');
    }

    throw new PlatformError('twitter', err.message);
  }
}

module.exports = {
  name: 'twitter',
  label: 'Twitter/X',
  check,
};
```

- [ ] **Step 4: Run tests**

Run: `npx jest tests/platforms/twitter.test.js --verbose`
Expected: PASS (3 tests). Note: real HTTP calls to X.

- [ ] **Step 5: Commit**

```bash
git add src/platforms/twitter.js tests/platforms/twitter.test.js
git commit -m "feat: add Twitter/X platform module"
```

---

### Task 7: YouTube Platform Module

**Files:**
- Create: `src/platforms/youtube.js`
- Create: `tests/platforms/youtube.test.js`

- [ ] **Step 1: Write tests for YouTube module**

```js
// tests/platforms/youtube.test.js
const { getPlatform } = require('../../../src/platforms');

describe('youtube platform', () => {
  it('is registered in the platform registry', () => {
    const platform = getPlatform('youtube');
    expect(platform).not.toBeNull();
    expect(platform.name).toBe('youtube');
    expect(platform.label).toBe('YouTube');
    expect(typeof platform.check).toBe('function');
  });

  it('returns normalized response for a valid channel handle', async () => {
    const platform = getPlatform('youtube');
    const result = await platform.check('@MrBeast');
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('platform', 'youtube');
    expect(result).toHaveProperty('username');
    expect(result).toHaveProperty('exists', true);
    expect(result).toHaveProperty('stats');
    expect(result.stats).toHaveProperty('subscribers');
    expect(result.stats).toHaveProperty('videos');
  });

  it('returns exists=false for an invalid channel', async () => {
    const platform = getPlatform('youtube');
    const result = await platform.check('@thischannelsurelydoesnotexist123456789xyz');
    expect(result.exists).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/platforms/youtube.test.js --verbose`
Expected: FAIL — getPlatform('youtube') is null

- [ ] **Step 3: Implement YouTube platform module**

```js
// src/platforms/youtube.js
const axios = require('axios');
const cheerio = require('cheerio');
const { PlatformError, RateLimitedError } = require('../utils/errors');

const TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '10000', 10);

function parseCount(str) {
  if (!str) return null;
  const cleaned = str.replace(/,/g, '').trim();
  const lower = cleaned.toLowerCase();
  if (lower.includes('subscriber')) {
    const num = lower.match(/([\d.]+)\s*(k|m|b)?/i);
    if (num) {
      const val = parseFloat(num[1]);
      const mult = num[2] ? num[2].toLowerCase() : '';
      if (mult === 'k') return Math.round(val * 1000);
      if (mult === 'm') return Math.round(val * 1000000);
      if (mult === 'b') return Math.round(val * 1000000000);
      return Math.round(val);
    }
  }
  return null;
}

async function check(username) {
  const handle = username.startsWith('@') ? username : `@${username}`;
  const url = `https://www.youtube.com/${encodeURIComponent(handle)}`;

  try {
    const response = await axios.get(url, {
      timeout: TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const html = response.data;
    const $ = cheerio.load(html);

    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    const ogImage = $('meta[property="og:image"]').attr('content') || '';
    const ogDescription = $('meta[property="og:description"]').attr('content') || '';

    // Check for channel not found
    if (html.includes('404 Not Found') || html.includes('This channel does not exist') || !ogTitle) {
      return {
        id: username,
        platform: 'youtube',
        username: null,
        avatar: null,
        verified: false,
        exists: false,
        stats: { followers: null, following: null, likes: null, posts: null },
        extras: {},
        raw: null,
      };
    }

    const subscriberCount = parseCount(ogDescription);
    const videoCountMatch = ogDescription.match(/([\d,]+)\s+videos?/i);
    const videoCount = videoCountMatch ? parseInt(videoCountMatch[1].replace(/,/g, ''), 10) : null;

    return {
      id: username,
      platform: 'youtube',
      username: ogTitle.replace(/\s*- YouTube$/, '').trim() || username,
      avatar: ogImage || null,
      verified: false,
      exists: true,
      stats: {
        followers: subscriberCount,
        following: null,
        likes: null,
        posts: videoCount,
      },
      extras: {
        bio: ogDescription,
      },
      raw: { ogTitle, ogImage, ogDescription },
    };
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return {
        id: username,
        platform: 'youtube',
        username: null,
        avatar: null,
        verified: false,
        exists: false,
        stats: { followers: null, following: null, likes: null, posts: null },
        extras: {},
        raw: null,
      };
    }

    if (err.response && err.response.status === 429) {
      throw new RateLimitedError('youtube');
    }

    throw new PlatformError('youtube', err.message);
  }
}

module.exports = {
  name: 'youtube',
  label: 'YouTube',
  check,
};
```

- [ ] **Step 4: Run tests**

Run: `npx jest tests/platforms/youtube.test.js --verbose`
Expected: PASS (3 tests). Note: real HTTP calls to YouTube.

- [ ] **Step 5: Commit**

```bash
git add src/platforms/youtube.js tests/platforms/youtube.test.js
git commit -m "feat: add YouTube platform module"
```

---

### Task 8: Check Route with Error Handling

**Files:**
- Create: `src/routes/check.js`
- Create: `tests/routes/check.test.js`

- [ ] **Step 1: Write tests for the check route**

```js
// tests/routes/check.test.js
const request = require('supertest');
const app = require('../../../src/index');

describe('GET /api/check/:platform/:username', () => {
  it('returns 400 for unsupported platform', async () => {
    const res = await request(app).get('/api/check/snapchat/testuser');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_PLATFORM');
    expect(res.body.error.supportedPlatforms).toBeDefined();
  });

  it('returns 400 when username is empty', async () => {
    const res = await request(app).get('/api/check/tiktok/');
    expect(res.status).toBe(400);
  });

  it('returns success response for tiktok', async () => {
    const res = await request(app).get('/api/check/tiktok/nasa');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.platform).toBe('tiktok');
    expect(res.body.data).toHaveProperty('platform', 'tiktok');
    expect(res.body.data).toHaveProperty('stats');
  });

  it('lists supported platforms on /api/check', async () => {
    const res = await request(app).get('/api/check');
    expect(res.status).toBe(200);
    expect(res.body.platforms).toBeDefined();
    expect(res.body.platforms.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/routes/check.test.js --verbose`
Expected: FAIL — route handler not yet created

- [ ] **Step 3: Implement check route**

```js
// src/routes/check.js
const express = require('express');
const router = express.Router();
const { getPlatform, listPlatforms } = require('../platforms');
const { AppError } = require('../utils/errors');

// List all supported platforms
router.get('/', (req, res) => {
  const platforms = listPlatforms().map(p => ({ name: p.name, label: p.label }));
  res.json({ platforms });
});

// Check a username on a platform
router.get('/:platform/:username', async (req, res, next) => {
  const { platform: platformName, username } = req.params;

  if (!username || username.trim() === '') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_USERNAME',
        message: 'Username is required',
      },
    });
  }

  const platform = getPlatform(platformName);

  if (!platform) {
    const supported = listPlatforms().map(p => p.name);
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_PLATFORM',
        message: `Platform '${platformName}' is not supported`,
        supportedPlatforms: supported,
      },
    });
  }

  try {
    const data = await platform.check(username.trim());
    res.json({
      success: true,
      platform: platform.name,
      data,
    });
  } catch (err) {
    next(err);
  }
});

// Error handler
router.use((err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
  }

  console.error('Unexpected error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
});

module.exports = router;
```

- [ ] **Step 4: Run all tests**

Run: `npx jest --verbose`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/routes/check.js tests/routes/check.test.js
git commit -m "feat: add check route with error handling"
```

---

### Task 9: Final Verification

**Files:** None new

- [ ] **Step 1: Start server and test manually**

```bash
npm start
```

Then in another terminal:

```bash
curl http://localhost:3000/api/check
curl http://localhost:3000/api/check/tiktok/taufik.hidayat.dev
curl http://localhost:3000/api/check/instagram/nasa
curl http://localhost:3000/api/check/twitter/x
curl http://localhost:3000/api/check/youtube/@MrBeast
curl http://localhost:3000/api/check/snapchat/test
```

Expected: JSON responses matching the spec format.

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete social account checker API v1"
```
