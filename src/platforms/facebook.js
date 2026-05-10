const axios = require('axios');
const cheerio = require('cheerio');
const { PlatformError, RateLimitedError } = require('../utils/errors');
const { getRandomUserAgent, withRetry } = require('../utils/http');

const TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '10000', 10);

async function check(username) {
  const url = `https://www.facebook.com/${encodeURIComponent(username)}`;

  try {
    const response = await withRetry(async () => {
      return await axios.get(url, {
        timeout: TIMEOUT,
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'max-age=0',
          'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"macOS"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
        },
        maxRedirects: 5,
      });
    });

    const html = typeof response.data === 'string' ? response.data : '';

    // Check for common error pages or login walls
    if (html.includes('Sorry, something went wrong') || html.includes('id="facebook"') && html.includes('Error</title>')) {
      // If we detect an error page, it's likely an inaccessible profile or a block.
      // Returning exists: true with a note is safer than assuming non-existence.
      return {
        id: username,
        platform: 'facebook',
        username: null,
        avatar: null,
        verified: false,
        exists: true,
        stats: { followers: null, following: null, likes: null, posts: null },
        extras: {
          note: 'Facebook blocks detailed scraping. Account exists but data is limited or request was blocked.',
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
      // If no identifying title/description is found, assume not found
      return notFound(username);
    }

    const displayName = ogTitle.replace(/\s*\|\s*Facebook$/, '').trim() || username;

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
    // Handle specific errors from the request
    if (err.response) {
      if (err.response.status === 404) {
        return notFound(username);
      }
      // Facebook redirects (e.g., to login) can indicate an account exists but is inaccessible for scraping
      if (err.response.status === 301 || err.response.status === 302) {
        return {
          id: username,
          platform: 'facebook',
          username: null,
          avatar: null,
          verified: false,
          exists: true, // Assume it exists due to redirect
          stats: { followers: null, following: null, likes: null, posts: null },
          extras: {
            note: 'Facebook redirect suggests account exists but data access is limited.',
          },
          raw: null,
        };
      }
      if (err.response.status === 429) {
        throw new RateLimitedError('facebook');
      }
    }
    // Catch-all for other platform errors
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
