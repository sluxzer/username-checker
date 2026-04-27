const axios = require('axios');
const cheerio = require('cheerio');
const { PlatformError, RateLimitedError } = require('../utils/errors');

const TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '10000', 10);

function parseCount(str) {
  if (!str) return null;
  const lower = str.toLowerCase();
  const num = lower.match(/([\d.]+)\s*(k|m|b)?/i);
  if (!num) return null;
  const val = parseFloat(num[1]);
  const mult = num[2] ? num[2].toLowerCase() : '';
  if (mult === 'k') return Math.round(val * 1000);
  if (mult === 'm') return Math.round(val * 1000000);
  if (mult === 'b') return Math.round(val * 1000000000);
  return Math.round(val);
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
