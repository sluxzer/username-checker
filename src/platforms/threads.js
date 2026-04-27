const axios = require('axios');
const cheerio = require('cheerio');
const { PlatformError, RateLimitedError } = require('../utils/errors');

const TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '10000', 10);

function unescape(str) {
  return str ? str.replace(/\\u[\dA-Fa-f]{4}/g, m => String.fromCharCode(parseInt(m.slice(2), 16))) : null;
}

async function check(username) {
  const handle = username.startsWith('@') ? username : `@${username}`;
  const url = `https://www.threads.net/${encodeURIComponent(handle)}`;

  try {
    const response = await axios.get(url, {
      timeout: TIMEOUT,
      headers: {
        'User-Agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)',
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      maxRedirects: 5,
    });

    let html = typeof response.data === 'string' ? response.data : '';
    if (!html && typeof response.data === 'object') {
      html = JSON.stringify(response.data);
    }
    if (!html || (html.includes('error') && html.includes('something went wrong'))) {
      return notFound(username);
    }

    const fullNameMatch = html.match(/"full_name"\s*:\s*"([^"]*)"/);
    const bioMatch = html.match(/"biography"\s*:\s*"([^"]*)"/);
    const picMatch = html.match(/"profile_pic_url"\s*:\s*"([^"]*)"/);
    const verifiedMatch = html.match(/"is_verified"\s*:\s*(true|false)/);
    const followerMatch = html.match(/"follower_count"\s*:\s*(\d+)/);

    if (!fullNameMatch && !html.includes(`"username":"${handle.replace('@', '')}"`)) {
      return notFound(username);
    }

    const avatarUrl = picMatch ? picMatch[1].replace(/\\\//g, '/') : null;

    return {
      id: handle.replace('@', ''),
      platform: 'threads',
      username: unescape(fullNameMatch ? fullNameMatch[1] : null),
      avatar: avatarUrl,
      verified: verifiedMatch ? verifiedMatch[1] === 'true' : false,
      exists: true,
      stats: {
        followers: followerMatch ? parseInt(followerMatch[1], 10) : null,
        following: null,
        likes: null,
        posts: null,
      },
      extras: {
        bio: unescape(bioMatch ? bioMatch[1] : null),
      },
      raw: {
        full_name: fullNameMatch ? fullNameMatch[1] : null,
        biography: bioMatch ? bioMatch[1] : null,
        is_verified: verifiedMatch ? verifiedMatch[1] : null,
        follower_count: followerMatch ? followerMatch[1] : null,
      },
    };
  } catch (err) {
    if (err.response && (err.response.status === 404 || err.response.status === 301)) {
      return notFound(username);
    }

    if (err.response && err.response.status === 429) {
      throw new RateLimitedError('threads');
    }

    throw new PlatformError('threads', err.message);
  }
}

function notFound(username) {
  return {
    id: username,
    platform: 'threads',
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
  name: 'threads',
  label: 'Threads',
  check,
};
