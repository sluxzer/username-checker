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

function notFound(username) {
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

async function check(username) {
  const url = `https://www.instagram.com/${encodeURIComponent(username)}/`;

  try {
    const response = await axios.get(url, {
      timeout: TIMEOUT,
      headers: {
        'User-Agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)',
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const html = response.data;
    const $ = cheerio.load(html);

    const metaDesc = $('meta[name="description"]').attr('content') || '';
    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    const ogImage = $('meta[property="og:image"]').attr('content') || '';
    const ogDesc = $('meta[property="og:description"]').attr('content') || '';

    const source = metaDesc || ogDesc;
    if (!source && !ogTitle) {
      return notFound(username);
    }

    const followerMatch = source.match(/([\d,]+\.?\d*[kKmM]?)\s+Followers/i);
    const followingMatch = source.match(/([\d,]+\.?\d*[kKmM]?)\s+Following/i);
    const postsMatch = source.match(/([\d,]+\.?\d*[kKmM]?)\s+Posts/i);

    const displayName = ogTitle.replace(/\s*\(@.*\)\s*•?\s*Instagram.*$/, '').trim() || username;

    return {
      id: username,
      platform: 'instagram',
      username: displayName || null,
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
        bio: source,
      },
      raw: { metaDescription: metaDesc, ogTitle, ogImage, ogDescription: ogDesc },
    };
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return notFound(username);
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
