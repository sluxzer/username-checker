const request = require('supertest');
const app = require('../../src/index');

describe('GET /api/check/:platform/:username', () => {
  it('returns 400 for unsupported platform', async () => {
    const res = await request(app).get('/api/check/snapchat/testuser');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_PLATFORM');
    expect(res.body.error.supportedPlatforms).toBeDefined();
  });

  it('returns success response for tiktok', async () => {
    const res = await request(app).get('/api/check/tiktok/nasa');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.platform).toBe('tiktok');
    expect(res.body.data).toHaveProperty('platform', 'tiktok');
    expect(res.body.data).toHaveProperty('stats');
  });

  it('lists supported platforms on /api/check', async () => {
    const res = await request(app).get('/api/check');
    expect(res.status).toBe(200);
    expect(res.body.platforms).toBeDefined();
    expect(res.body.platforms.length).toBeGreaterThan(0);
  });
});
