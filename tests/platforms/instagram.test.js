const { getPlatform } = require('../../src/platforms');

describe('instagram platform', () => {
  it('is registered in the platform registry', () => {
    const platform = getPlatform('instagram');
    expect(platform).not.toBeNull();
    expect(platform.name).toBe('instagram');
    expect(platform.label).toBe('Instagram');
    expect(typeof platform.check).toBe('function');
  });

  it('returns normalized response for a valid username', async () => {
    const platform = getPlatform('instagram');
    const result = await platform.check('nasa');
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('platform', 'instagram');
    expect(result).toHaveProperty('username');
    expect(result).toHaveProperty('exists', true);
    expect(result).toHaveProperty('stats');
    expect(result.stats).toHaveProperty('followers');
    expect(result.stats).toHaveProperty('following');
    expect(result.stats).toHaveProperty('posts');
  });

  it('returns exists=false for an invalid username', async () => {
    const platform = getPlatform('instagram');
    const result = await platform.check('thisusersurelydoesnotexist123456789xyz');
    expect(result.exists).toBe(false);
  });
});
