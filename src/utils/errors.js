class AppError extends Error {
  constructor(code, message, statusCode) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

class AccountNotFoundError extends AppError {
  constructor(platform, username) {
    super('ACCOUNT_NOT_FOUND', `Account '${username}' not found on ${platform}`, 404);
  }
}

class RateLimitedError extends AppError {
  constructor(platform) {
    super('RATE_LIMITED', `Rate limited by ${platform}`, 429);
  }
}

class PlatformError extends AppError {
  constructor(platform, detail) {
    super('PLATFORM_ERROR', `${platform}: ${detail}`, 502);
  }
}

class PlatformUnavailableError extends AppError {
  constructor(platform) {
    super('PLATFORM_UNAVAILABLE', `${platform} is temporarily unavailable`, 503);
  }
}

module.exports = { AppError, AccountNotFoundError, RateLimitedError, PlatformError, PlatformUnavailableError };
