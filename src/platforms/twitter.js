const axios = require('axios');
const cheerio = require('cheerio');
const { PlatformError, RateLimitedError } = require('../utils/errors');

const TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '10000', 10);

function parseCount(str) {
  if (!str) return null;
  const cleaned = str.replace(/,/g, '');
  const lower = cleaned.toLowerCase();
  if (lower.endsWith('k')) return Math.round(parseFloat(lower) * 1000);
  if (lower.endsWith('m')) return Math.round(parseFloat(lower) * 1000000);
  return parseInt(cleaned, 10);
}

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

    const followerMatch = ogDescription.match(/([\d,]+\.?\d*[kKmM]?)\s+Followers/i);
    const followingMatch = ogDescription.match(/([\d,]+\.?\d*[kKmM]?)\s+Following/i);
    const postsMatch = ogDescription.match(/([\d,]+\.?\d*[kKmM]?)\s+Posts/i);

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
