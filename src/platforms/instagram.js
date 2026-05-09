const axios = require('axios');
const cheerio = require('cheerio');
const { PlatformError, RateLimitedError } = require('../utils/errors');
const { getRandomUserAgent, withRetry } = require('../utils/http');

const TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '10000', 10);
const IG_APP_IDS = [
  '936619743392459',
  '1217981644879628',
];

function getRandomAppId() {
  return IG_APP_IDS[Math.floor(Math.random() * IG_APP_IDS.length)];
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
  const url = `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;
  
  return withRetry(async () => {
    const response = await axios.get(url, {
      timeout: TIMEOUT,
      headers: {
        'User-Agent': getRandomUserAgent(),
        'X-IG-App-ID': getRandomAppId(),
        'X-ASBD-ID': '129477',
        'X-IG-WWW-Claim': '0',
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': 'https://www.instagram.com',
        'Referer': `https://www.instagram.com/${encodeURIComponent(username)}/`,
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
  });
}

async function checkViaScraping(username) {
  const url = `https://www.instagram.com/${encodeURIComponent(username)}/`;
  
  return withRetry(async () => {
    const response = await axios.get(url, {
      timeout: TIMEOUT,
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'max-age=0',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
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
  });
}

async function checkViaMobileAPI(username) {
  const url = `https://i.instagram.com/api/v1/users/username_info/?username=${encodeURIComponent(username)}`;
  
  return withRetry(async () => {
    const response = await axios.get(url, {
      timeout: TIMEOUT,
      headers: {
        'User-Agent': 'Instagram 311.0.0.32.118 Android (33/13; 480dpi; 1080x2251; Google/pixel; sunfish; sunfish; en_US; 547953254)',
        'X-IG-App-ID': '1217981644879628',
        'X-ASBD-ID': '129477',
        'Accept': '*/*',
      },
    });

    const user = response.data?.user;
    if (!user) return null;

    return {
      id: username,
      platform: 'instagram',
      username: user.full_name || user.username,
      avatar: user.profile_pic_url || null,
      verified: user.is_verified || false,
      exists: true,
      stats: {
        followers: user.follower_count ?? null,
        following: user.following_count ?? null,
        likes: null,
        posts: user.media_count ?? null,
      },
      extras: {
        bio: user.biography || '',
      },
      raw: {
        username: user.username,
        isPrivate: user.is_private,
        pk: user.pk,
      },
    };
  });
}

async function checkViaEmbed(username) {
  const url = `https://www.instagram.com/${encodeURIComponent(username)}/embed/`;
  
  return withRetry(async () => {
    const response = await axios.get(url, {
      timeout: TIMEOUT,
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html',
      },
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Embed pages have a specific structure
    const avatar = $('.Avatar').attr('src') || $('.ProfileImage').attr('src');
    const displayName = $('.UsernameText').text().trim() || username;
    
    // Sometimes stats are in the description or footer of the embed
    const bodyText = $('body').text();
    const followerMatch = bodyText.match(/([\d,]+\.?\d*[kKmM]?)\s+Followers/i);

    if (!avatar && !bodyText.includes(username)) return null;

    return {
      id: username,
      platform: 'instagram',
      username: displayName || username,
      avatar: avatar || null,
      verified: html.includes('Verified'),
      exists: true,
      stats: {
        followers: followerMatch ? parseCount(followerMatch[1]) : null,
        following: null,
        likes: null,
        posts: null,
      },
      extras: {
        source: 'embed',
      },
      raw: { embedUrl: url },
    };
  });
}

async function check(username) {
  try {
    // 1. Try Web API
    const result = await checkViaAPI(username);
    if (result) return result;

    // 2. Try Mobile API
    const mobileResult = await checkViaMobileAPI(username);
    if (mobileResult) return mobileResult;

    // 3. Try Embed Page (High resilience)
    const embedResult = await checkViaEmbed(username);
    if (embedResult) return embedResult;

    // 4. Try Scraping
    const scraped = await checkViaScraping(username);
    if (scraped) return scraped;

    return notFound(username);
  } catch (err) {
    if (err.response?.status === 404) return notFound(username);
    
    // Attempt all fallbacks even on 429/403
    try {
      const mobileResult = await checkViaMobileAPI(username);
      if (mobileResult) return mobileResult;
    } catch (_err) {}

    try {
      const embedResult = await checkViaEmbed(username);
      if (embedResult) return embedResult;
    } catch (_err) {}

    try {
      const scraped = await checkViaScraping(username);
      if (scraped) return scraped;
    } catch (_err) {
      if (_err.response?.status === 429) throw new RateLimitedError('instagram');
    }

    if (err.response?.status === 429) throw new RateLimitedError('instagram');
    throw new PlatformError('instagram', err.message);
  }
}

module.exports = {
  name: 'instagram',
  label: 'Instagram',
  check,
};
