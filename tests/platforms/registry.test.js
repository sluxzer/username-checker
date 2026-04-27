const { getPlatform, listPlatforms } = require('../../src/platforms');

describe('platform registry', () => {
  it('lists all registered platforms', () => {
    const platforms = listPlatforms();
    expect(platforms.length).toBeGreaterThan(0);
    platforms.forEach(p => {
      expect(p).toHaveProperty('name');
      expect(p).toHaveProperty('label');
      expect(p).toHaveProperty('check');
    });
  });

  it('retrieves a platform by name', () => {
    const platform = getPlatform('tiktok');
    expect(platform).not.toBeNull();
    expect(platform.name).toBe('tiktok');
  });

  it('returns null for unknown platform', () => {
    const platform = getPlatform('snapchat');
    expect(platform).toBeNull();
  });
});
