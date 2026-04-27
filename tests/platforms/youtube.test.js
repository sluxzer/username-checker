const { getPlatform } = require('../../src/platforms');

describe('youtube platform', () => {
  it('is registered in the platform registry', () => {
    const platform = getPlatform('youtube');
    expect(platform).not.toBeNull();
    expect(platform.name).toBe('youtube');
    expect(platform.label).toBe('YouTube');
    expect(typeof platform.check).toBe('function');
  });

  it('returns normalized response for a valid channel handle', async () => {
    const platform = getPlatform('youtube');
    const result = await platform.check('@MrBeast');
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('platform', 'youtube');
    expect(result).toHaveProperty('username');
    expect(result).toHaveProperty('exists', true);
    expect(result).toHaveProperty('stats');
    expect(result.stats).toHaveProperty('followers');
    expect(result.stats).toHaveProperty('posts');
  });

  it('returns exists=false for an invalid channel', async () => {
    const platform = getPlatform('youtube');
    const result = await platform.check('@thischannelsurelydoesnotexist123456789xyz');
    expect(result.exists).toBe(false);
  });
});
