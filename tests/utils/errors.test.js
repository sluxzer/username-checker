const { AppError, AccountNotFoundError, RateLimitedError, PlatformError } = require('../../src/utils/errors');

describe('AppError', () => {
  it('sets code, message, and statusCode', () => {
    const err = new AppError('TEST_CODE', 'test message', 400);
    expect(err.code).toBe('TEST_CODE');
    expect(err.message).toBe('test message');
    expect(err.statusCode).toBe(400);
  });
});

describe('AccountNotFoundError', () => {
  it('sets 404 status', () => {
    const err = new AccountNotFoundError('tiktok', 'nouser');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('ACCOUNT_NOT_FOUND');
  });
});

describe('RateLimitedError', () => {
  it('sets 429 status', () => {
    const err = new RateLimitedError('tiktok');
    expect(err.statusCode).toBe(429);
    expect(err.code).toBe('RATE_LIMITED');
  });
});

describe('PlatformError', () => {
  it('sets 502 status', () => {
    const err = new PlatformError('tiktok', 'bad response');
    expect(err.statusCode).toBe(502);
    expect(err.code).toBe('PLATFORM_ERROR');
  });
});
