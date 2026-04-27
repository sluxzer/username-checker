const axios = require('axios');
const cheerio = require('cheerio');
const { PlatformError, RateLimitedError } = require('../utils/errors');

const TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '10000', 10);

function notFound(username) {
  return {
    id: username,
    platform: 'twitter',
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
  const url = `https://x.com/${encodeURIComponent(username)}`;

  try {
    const response = await axios.get(url, {
      timeout: TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    let html = typeof response.data === 'string' ? response.data : '';
    if (!html && typeof response.data === 'object') {
      html = JSON.stringify(response.data);
    }

    // Check if user data is in the JS payload
    const screenNameMatch = html.match(new RegExp(`"screen_name"\\s*:\\s*"${username}"`, 'i'));
    const screenNameMatchAny = html.match(/"screen_name"\s*:\s*"([^"]+)"/);

    if (!screenNameMatch && !screenNameMatchAny) {
      return notFound(username);
    }

    // Find the user object closest to the matching screen_name
    const nameMatch = html.match(/"name"\s*:\s*"([^"]+)"/);
    const followersMatch = html.match(/"followers_count"\s*:\s*(\d+)/);
    const friendsMatch = html.match(/"friends_count"\s*:\s*(\d+)/);
    const statusesMatch = html.match(/"statuses_count"\s*:\s*(\d+)/);
    const avatarMatch = html.match(/"profile_image_url_https"\s*:\s*"([^"]+)"/);
    const verifiedMatch = html.match(/"verified"\s*:\s*(true|false)/);
    const bioMatch = html.match(/"description"\s*:\s*"([^"]+)"/);

    const avatar = avatarMatch ? avatarMatch[1].replace(/_normal\./, '.') : null;

    return {
      id: username,
      platform: 'twitter',
      username: nameMatch ? nameMatch[1] : username,
      avatar: avatar,
      verified: verifiedMatch ? verifiedMatch[1] === 'true' : false,
      exists: true,
      stats: {
        followers: followersMatch ? parseInt(followersMatch[1], 10) : null,
        following: friendsMatch ? parseInt(friendsMatch[1], 10) : null,
        likes: null,
        posts: statusesMatch ? parseInt(statusesMatch[1], 10) : null,
      },
      extras: {
        bio: bioMatch ? bioMatch[1] : null,
      },
      raw: {
        screen_name: screenNameMatchAny ? screenNameMatchAny[1] : null,
        followers_count: followersMatch ? followersMatch[1] : null,
        friends_count: friendsMatch ? friendsMatch[1] : null,
        statuses_count: statusesMatch ? statusesMatch[1] : null,
      },
    };
  } catch (err) {
    if (err.response && (err.response.status === 404 || err.response.status === 301)) {
      return notFound(username);
    }

    if (err.response && err.response.status === 429) {
      throw new RateLimitedError('twitter');
    }

    throw new PlatformError('twitter', err.message);
  }
}

module.exports = {
  name: 'twitter',
  label: 'Twitter/X',
  check,
};
