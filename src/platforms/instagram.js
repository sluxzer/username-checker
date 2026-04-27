const axios = require('axios');
const cheerio = require('cheerio');
const { PlatformError, RateLimitedError } = require('../utils/errors');

const TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '10000', 10);
const IG_APP_ID = '936619743392459';

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

async function checkViaAPI(username) {
  const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;
  const response = await axios.get(url, {
    timeout: TIMEOUT,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'X-IG-App-ID': IG_APP_ID,
      'Accept': 'application/json',
    },
  });

  const user = response.data?.data?.user;
  if (!user) return null;

  return {
    id: username,
    platform: 'instagram',
    username: user.full_name || user.username,
    avatar: user.profile_pic_url_hd || null,
    verified: user.is_verified || false,
    exists: true,
    stats: {
      followers: user.edge_followed_by?.count ?? null,
      following: user.edge_follow?.count ?? null,
      likes: null,
      posts: user.edge_owner_to_timeline_media?.count ?? null,
    },
    extras: {
      bio: user.biography || '',
    },
    raw: {
      username: user.username,
      isPrivate: user.is_private,
      externalUrl: user.external_url || null,
    },
  };
}

async function checkViaScraping(username) {
  const url = `https://www.instagram.com/${encodeURIComponent(username)}/`;
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
  if (!source && !ogTitle) return null;

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
    extras: { bio: source },
    raw: { metaDescription: metaDesc, ogTitle, ogImage, ogDescription: ogDesc },
  };
}

async function check(username) {
  try {
    const result = await checkViaAPI(username);
    if (result) return result;

    // Fallback to scraping if API returns no user data
    const scraped = await checkViaScraping(username);
    if (scraped) return scraped;

    return notFound(username);
  } catch (err) {
    if (err.response?.status === 404) return notFound(username);
    if (err.response?.status === 429) throw new RateLimitedError('instagram');

    // If API fails, try scraping as fallback
    try {
      const scraped = await checkViaScraping(username);
      if (scraped) return scraped;
    } catch (_err) {
      // Use original error
    }

    throw new PlatformError('instagram', err.message);
  }
}

module.exports = {
  name: 'instagram',
  label: 'Instagram',
  check,
};
