const axios = require('axios');
const cheerio = require('cheerio');
const { PlatformError, RateLimitedError } = require('../utils/errors');

const TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '10000', 10);

function parseCount(str) {
  if (!str) return null;
  const lower = str.toLowerCase();
  const num = lower.match(/([\d,]+\.?\d*)\s*(k|m|b|jt|rb)?/i);
  if (!num) return null;
  const val = parseFloat(num[1].replace(/,/g, ''));
  const mult = num[2] ? num[2].toLowerCase() : '';
  if (mult === 'k' || mult === 'rb') return Math.round(val * 1000);
  if (mult === 'm' || mult === 'jt') return Math.round(val * 1000000);
  if (mult === 'b') return Math.round(val * 1000000000);
  return Math.round(val);
}

function notFound(username) {
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

    let html = typeof response.data === 'string' ? response.data : '';
    if (!html && typeof response.data === 'object') {
      html = JSON.stringify(response.data);
    }

    const $ = cheerio.load(html);

    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    const ogImage = $('meta[property="og:image"]').attr('content') || '';
    const ogDescription = $('meta[property="og:description"]').attr('content') || '';

    if (!ogTitle || html.includes('404 Not Found') || html.includes('This channel does not exist')) {
      return notFound(username);
    }

    // Try og:description first
    let subscriberCount = parseCount(ogDescription);
    let videoCount = null;

    // Try subscriberCountText from page JSON
    if (!subscriberCount) {
      const subsMatch = html.match(/subscriberCountText.*?"simpleText"\s*:\s*"([^"]+)"/);
      if (subsMatch) {
        subscriberCount = parseCount(subsMatch[1]);
      }
    }

    // Try videoCountText from page JSON
    const videoMatch = html.match(/"videoCountText".*?"simpleText"\s*:\s*"([^"]+)"/);
    if (videoMatch) {
      const vNum = videoMatch[1].match(/([\d,]+\.?\d*)/);
      videoCount = vNum ? parseInt(vNum[1].replace(/,/g, ''), 10) : null;
    }

    if (!videoCount) {
      const videoDescMatch = ogDescription.match(/([\d,]+)\s+videos?/i);
      videoCount = videoDescMatch ? parseInt(videoDescMatch[1].replace(/,/g, ''), 10) : null;
    }

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
      return notFound(username);
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
