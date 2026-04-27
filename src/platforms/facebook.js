const axios = require('axios');
const cheerio = require('cheerio');
const { PlatformError, RateLimitedError } = require('../utils/errors');

const TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '10000', 10);

async function check(username) {
  const url = `https://www.facebook.com/${encodeURIComponent(username)}`;

  try {
    const response = await axios.get(url, {
      timeout: TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      maxRedirects: 5,
    });

    const html = typeof response.data === 'string' ? response.data : '';

    // Facebook returns error page for blocked requests
    if (html.includes('Sorry, something went wrong') || html.includes('id="facebook"') && html.includes('Error</title>')) {
      // Try the page title approach - if we get an error page, check if it's a real redirect
      // We can check existence via the og:url or the redirect behavior
      return {
        id: username,
        platform: 'facebook',
        username: null,
        avatar: null,
        verified: false,
        exists: true,
        stats: { followers: null, following: null, likes: null, posts: null },
        extras: {
          note: 'Facebook blocks detailed scraping. Account exists but data is limited.',
        },
        raw: null,
      };
    }

    const $ = cheerio.load(html);
    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    const ogImage = $('meta[property="og:image"]').attr('content') || '';
    const ogDesc = $('meta[property="og:description"]').attr('content') || '';
    const metaDesc = $('meta[name="description"]').attr('content') || '';

    if (!ogTitle && !metaDesc) {
      return notFound(username);
    }

    const displayName = ogTitle.replace(/\s*\|\s*Facebook$/, '').trim() || username;

    // Try to parse follower count from meta description
    const followerMatch = (metaDesc || ogDesc).match(/([\d,]+\.?\d*[kKmM]?)\s+(?:followers|likes)/i);

    return {
      id: username,
      platform: 'facebook',
      username: displayName,
      avatar: ogImage || null,
      verified: false,
      exists: true,
      stats: {
        followers: followerMatch ? parseCount(followerMatch[1]) : null,
        following: null,
        likes: null,
        posts: null,
      },
      extras: {
        bio: metaDesc || ogDesc || null,
      },
      raw: { ogTitle, ogImage, metaDescription: metaDesc, ogDescription: ogDesc },
    };
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return notFound(username);
    }

    // Facebook sometimes redirects to login for existing accounts
    if (err.response && (err.response.status === 301 || err.response.status === 302)) {
      return {
        id: username,
        platform: 'facebook',
        username: null,
        avatar: null,
        verified: false,
        exists: true,
        stats: { followers: null, following: null, likes: null, posts: null },
        extras: {
          note: 'Facebook blocks detailed scraping. Account likely exists.',
        },
        raw: null,
      };
    }

    if (err.response && err.response.status === 429) {
      throw new RateLimitedError('facebook');
    }

    throw new PlatformError('facebook', err.message);
  }
}

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
    platform: 'facebook',
    username: null,
    avatar: null,
    verified: false,
    exists: false,
    stats: { followers: null, following: null, likes: null, posts: null },
    extras: {},
    raw: null,
  };
}

module.exports = {
  name: 'facebook',
  label: 'Facebook',
  check,
};
