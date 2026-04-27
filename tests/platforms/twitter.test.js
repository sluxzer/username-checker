const { getPlatform } = require('../../src/platforms');

describe('twitter platform', () => {
  it('is registered in the platform registry', () => {
    const platform = getPlatform('twitter');
    expect(platform).not.toBeNull();
    expect(platform.name).toBe('twitter');
    expect(platform.label).toBe('Twitter/X');
    expect(typeof platform.check).toBe('function');
  });

  it('returns normalized response for a valid username', async () => {
    const platform = getPlatform('twitter');
    const result = await platform.check('x');
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('platform', 'twitter');
    expect(result).toHaveProperty('username');
    expect(result).toHaveProperty('exists', true);
    expect(result).toHaveProperty('stats');
    expect(result.stats).toHaveProperty('followers');
    expect(result.stats).toHaveProperty('following');
    expect(result.stats).toHaveProperty('posts');
  });

  it('returns exists=false for an invalid username', async () => {
    const platform = getPlatform('twitter');
    const result = await platform.check('thisusersurelydoesnotexist123456789xyz');
    expect(result.exists).toBe(false);
  });
});
