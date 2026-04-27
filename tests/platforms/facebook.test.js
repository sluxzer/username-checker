const { getPlatform } = require('../../src/platforms');

describe('facebook platform', () => {
  it('is registered in the platform registry', () => {
    const platform = getPlatform('facebook');
    expect(platform).not.toBeNull();
    expect(platform.name).toBe('facebook');
    expect(platform.label).toBe('Facebook');
    expect(typeof platform.check).toBe('function');
  });

  it('returns normalized response for nasa', async () => {
    const platform = getPlatform('facebook');
    const result = await platform.check('nasa');
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('platform', 'facebook');
    expect(result).toHaveProperty('exists');
  }, 15000);
});
