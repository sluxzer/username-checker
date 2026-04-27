const { getPlatform } = require('../../src/platforms');

describe('tiktok platform', () => {
  it('is registered in the platform registry', () => {
    const platform = getPlatform('tiktok');
    expect(platform).not.toBeNull();
    expect(platform.name).toBe('tiktok');
    expect(platform.label).toBe('TikTok');
    expect(typeof platform.check).toBe('function');
  });

  it('returns normalized response shape', async () => {
    const platform = getPlatform('tiktok');
    const result = await platform.check('taufik.hidayat.dev');
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('platform', 'tiktok');
    expect(result).toHaveProperty('username');
    expect(result).toHaveProperty('avatar');
    expect(result).toHaveProperty('verified');
    expect(result).toHaveProperty('exists');
    expect(result).toHaveProperty('stats');
    expect(result.stats).toHaveProperty('followers');
    expect(result.stats).toHaveProperty('following');
    expect(result.stats).toHaveProperty('likes');
    expect(result.stats).toHaveProperty('posts');
    expect(result).toHaveProperty('extras');
    expect(result).toHaveProperty('raw');
    // Note: exists may be false due to anti-bot protections in CI
  });

  it('returns exists=false for an invalid username', async () => {
    const platform = getPlatform('tiktok');
    const result = await platform.check('thisusersurelydoesnotexist123456789xyz');
    expect(result.exists).toBe(false);
  });
});
