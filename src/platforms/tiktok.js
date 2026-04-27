const axios = require('axios');
const cheerio = require('cheerio');
const { PlatformError, RateLimitedError } = require('../utils/errors');

const TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '10000', 10);

async function check(username) {
  const url = `https://www.tiktok.com/@${encodeURIComponent(username)}`;

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

    // Try extracting from __UNIVERSAL_DATA_FOR_REHYDRATION__
    const scriptUniversal = html.match(/window\['__UNIVERSAL_DATA_FOR_REHYDRATION__'\]\s*=\s*({.+?})\s*;?\s*<\/script>/s);
    // Also try SIGI_STATE as fallback
    const $ = cheerio.load(html);
    const scriptSigi = $('script#SIGI_STATE').html();

    let userData = null;

    if (scriptUniversal) {
      try {
        const json = JSON.parse(scriptUniversal[1]);
        const scopes = json['__DEFAULT_SCOPE__'];
        if (scopes) {
          const detailModule = scopes['webapp.user-detail'];
          if (detailModule) {
            userData = detailModule.userInfo;
          }
        }
      } catch (e) {
        // fallback below
      }
    }

    if (!userData && scriptSigi) {
      try {
        const json = JSON.parse(scriptSigi);
        const userModule = json['UserModule'];
        if (userModule) {
          userData = userModule.users && Object.values(userModule.users)[0];
        }
      } catch (e) {
        // continue
      }
    }

    if (!userData) {
      return {
        id: username,
        platform: 'tiktok',
        username: null,
        avatar: null,
        verified: false,
        exists: false,
        stats: { followers: null, following: null, likes: null, posts: null },
        extras: {},
        raw: null,
      };
    }

    const user = userData.user || userData;
    const stats = userData.stats || {};

    return {
      id: user.uniqueId || username,
      platform: 'tiktok',
      username: user.nickname || user.uniqueId,
      avatar: user.avatarMedium || user.avatarThumb || null,
      verified: !!user.verified,
      exists: true,
      stats: {
        followers: stats.followerCount ?? null,
        following: stats.followingCount ?? null,
        likes: stats.heartCount ?? null,
        posts: stats.videoCount ?? null,
      },
      extras: {
        bio: user.signature || null,
        createdAt: user.createTime || null,
      },
      raw: userData,
    };
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return {
        id: username,
        platform: 'tiktok',
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
      throw new RateLimitedError('tiktok');
    }

    throw new PlatformError('tiktok', err.message);
  }
}

module.exports = {
  name: 'tiktok',
  label: 'TikTok',
  check,
};
