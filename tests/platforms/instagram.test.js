// Mocking https-proxy-agent to bypass ES Module issues in tests
jest.mock('https-proxy-agent', () => {
  return jest.fn().mockImplementation(() => {
    return {};
  });
});

const { getPlatform } = require('../../src/platforms');

describe('instagram platform', () => {
  it('is registered in the platform registry', () => {
    const platform = getPlatform('instagram');
    expect(platform).not.toBeNull();
    expect(platform.name).toBe('instagram');
    expect(platform.label).toBe('Instagram');
    expect(typeof platform.check).toBe('function');
  });

  it('returns normalized response shape for a valid username', async () => {
    // Note: This test relies on a real network call. If Instagram blocks the IP, it might fail.
    // A more robust test would mock the axios calls within the platform module.
    const platform = getPlatform('instagram');
    const result = await platform.check('nasa'); // Using 'nasa' as a known valid public profile
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
    const result = await platform.check('thisusersurelydoesnotexist123456789xyz'); // A very unlikely username
    expect(result.exists).toBe(false);
    expect(result.username).toBeNull();
  });

  // Optional: Add tests for rate limiting or specific error cases if they can be reliably mocked or triggered.
});
