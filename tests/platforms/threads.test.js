const { getPlatform } = require('../../src/platforms');

describe('threads platform', () => {
  it('is registered in the platform registry', () => {
    const platform = getPlatform('threads');
    expect(platform).not.toBeNull();
    expect(platform.name).toBe('threads');
    expect(platform.label).toBe('Threads');
    expect(typeof platform.check).toBe('function');
  });

  it('returns normalized response shape', async () => {
    const platform = getPlatform('threads');
    const result = await platform.check('@zuck');
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('platform', 'threads');
    expect(result).toHaveProperty('username');
    expect(result).toHaveProperty('exists');
    expect(result).toHaveProperty('stats');
    expect(result.stats).toHaveProperty('followers');
  });

  it('returns exists=false for an invalid username', async () => {
    const platform = getPlatform('threads');
    const result = await platform.check('thisusersurelydoesnotexist123456789xyz');
    expect(result.exists).toBe(false);
  });
});
