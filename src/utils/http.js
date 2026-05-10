const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
];

const PROXY_URL = process.env.PROXY_URL;
const USE_PROXY = process.env.USE_PROXY === 'true';

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    shouldRetry = (err) => err.response?.status === 429,
  } = options;

  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries && shouldRetry(err)) {
        const delay = initialDelay * Math.pow(2, attempt) + Math.random() * 1000;
        await sleep(delay);
        continue;
      }
      throw err;
    }
  }
}

async function createAxiosInstance(config = {}) {
  const axiosConfig = { ...config };
  axiosConfig.headers = {
    ...axiosConfig.headers,
    'User-Agent': getRandomUserAgent(), // Default User-Agent
  };

  if (USE_PROXY && PROXY_URL) {
    axiosConfig.httpsAgent = new HttpsProxyAgent(PROXY_URL);
    axiosConfig.proxy = false; // Ensure axios doesn't try to use its own proxy logic
  }
  
  return axios.create(axiosConfig);
}

module.exports = {
  getRandomUserAgent,
  withRetry,
  sleep,
  USER_AGENTS,
  createAxiosInstance,
};
