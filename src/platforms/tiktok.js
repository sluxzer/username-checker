module.exports = {
  name: 'tiktok',
  label: 'TikTok',
  check: async (username) => ({ id: username, platform: 'tiktok', exists: false }),
};
