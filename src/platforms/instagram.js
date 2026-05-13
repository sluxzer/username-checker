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
      },
      maxRedirects: 5,
    });

    const html = response.data;
    if (html.includes('login') && html.includes('password')) {
      // Detected login wall
      return null;
    }

    const $ = cheerio.load(html);

    // 1. Try JSON-LD (Search engine data)
    const jsonLd = $('script[type="application/ld+json"]').html();
    if (jsonLd) {
      try {
        const data = JSON.parse(jsonLd);
        const mainEntity = data.mainEntityofPage;
        if (mainEntity) {
          const stats = {};
          const interactions = mainEntity.interactionStatistic || [];
          interactions.forEach(s => {
            if (s.interactionType === 'http://schema.org/FollowAction') stats.followers = s.userInteractionCount;
            if (s.interactionType === 'http://schema.org/WriteAction') stats.posts = s.userInteractionCount;
          });

          return {
            id: username,
            platform: 'instagram',
            username: data.name || username,
            avatar: data.image || null,
            verified: false,
            exists: true,
            stats: {
              followers: stats.followers || null,
              following: null,
              likes: null,
              posts: stats.posts || null,
            },
            extras: { bio: data.description || '', source: 'json-ld' },
            raw: { jsonLd: data },
          };
        }
      } catch (e) {}
    }

    // 2. Fallback to Meta Tags
    const metaDesc = $('meta[name="description"]').attr('content') || '';
    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    const ogImage = $('meta[property="og:image"]').attr('content') || '';
    const ogDesc = $('meta[property="og:description"]').attr('content') || '';

    const source = metaDesc || ogDesc;
    
    // Check if it looks like a real profile
    if (!ogTitle || ogTitle === 'Instagram' || ogTitle.toLowerCase().includes('page not found')) {
      return null;
    }

    if (!source && !ogImage) return null;

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
      extras: { bio: source, source: 'meta' },
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

    // If no avatar and no followers found, it's likely not a profile
    if (!avatar && !followerMatch) return null;

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

async function checkViaInstrack(username) {
  const url = `https://instrack.app/api/account/${encodeURIComponent(username)}`;
  
  return withRetry(async () => {
    const instance = axios.create({
      headers: {
        'accept': 'application/json, text/plain, */*',
        'accept-language': 'en-US,en;q=0.9,id;q=0.8',
        // Dynamic tokens/cookies are hard to replicate programmatically without their API key or session handling
        // 'aws-waf-token': '...',
        // '_ga': '...',
        // '_gcl_au': '...',
        // 'XSRF-TOKEN': '...',
        // 'instrack_session': '...',
        'priority': 'u=1, i',
        'referer': `https://instrack.app/instagram/${encodeURIComponent(username)}`,
        'sec-ch-ua': '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'sentry-trace': '2863d3c903b84076bc7b85e55b6f5e05-badd45b2e4025752-1', // Example, might need dynamic generation
        'x-requested-with': 'XMLHttpRequest',
        'x-xsrf-token': 'PLACEHOLDER_FOR_DYNAMIC_TOKEN', // This token is dynamic and needs to be obtained
      },
      timeout: TIMEOUT,
    });
    
    const response = await instance.get(url);

    // Assuming response.data is JSON
    const data = response.data;
    if (!data || !data.data) return null; // Adjust based on actual response structure

    const profile = data.data.user; // Assuming user data is here

    return {
      id: profile.pk || username, // Use pk if available, else username
      platform: 'instagram',
      username: profile.username || username,
      avatar: profile.profile_pic_url || null,
      verified: profile.is_verified || false,
      exists: true,
      stats: {
        followers: profile.edge_followed_by?.count ?? null,
        following: profile.edge_follow?.count ?? null,
        likes: null, // Not typically available from this endpoint
        posts: profile.edge_owner_to_timeline_media?.count ?? null,
      },
      extras: {
        bio: profile.biography || '',
        source: 'instrack_api',
      },
      raw: data, // Keep raw data for debugging
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

    // 3. Try Instrack API
    const instrackResult = await checkViaInstrack(username);
    if (instrackResult) return instrackResult;

    // 4. Try Embed Page (High resilience)
    const embedResult = await checkViaEmbed(username);
    if (embedResult) return embedResult;

    // 5. Try Scraping
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
      const instrackResult = await checkViaInstrack(username);
      if (instrackResult) return instrackResult;
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
  checkViaAPI,
  checkViaMobileAPI,
  checkViaInstrack,
  checkViaEmbed,
  checkViaScraping,
};
