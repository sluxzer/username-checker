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

    const metaDesc = $('meta[name="description"]').attr('content') || '';
    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    const ogImage = $('meta[property="og:image"]').attr('content') || '';

    const followerMatch = metaDesc.match(/([\d,]+\.?\d*[kKmM]?)\s+Followers/i);
    const followingMatch = metaDesc.match(/([\d,]+\.?\d*[kKmM]?)\s+Following/i);
    const postsMatch = metaDesc.match(/([\d,]+\.?\d*[kKmM]?)\s+Posts/i);

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
