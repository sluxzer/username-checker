const express = require('express');
const router = express.Router();
const { getPlatform, listPlatforms } = require('../platforms');
const { AppError } = require('../utils/errors');
const cache = require('../utils/cache');

// List all supported platforms
router.get('/', (req, res) => {
  const platforms = listPlatforms().map(p => ({ name: p.name, label: p.label }));
  res.json({ platforms });
});

// Check a username on a platform
router.get('/:platform/:username', async (req, res, next) => {
  const { platform: platformName, username } = req.params;
  const force = req.query.force === 'true';

  if (!username || username.trim() === '') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_USERNAME',
        message: 'Username is required',
      },
    });
  }

  const platform = getPlatform(platformName);

  if (!platform) {
    const supported = listPlatforms().map(p => p.name);
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_PLATFORM',
        message: `Platform '${platformName}' is not supported`,
        supportedPlatforms: supported,
      },
    });
  }

  const cacheKey = `check:${platform.name}:${username.trim().toLowerCase()}`;

  try {
    // Check cache first if not forced
    if (!force) {
      const cachedData = await cache.get(cacheKey);
      if (cachedData) {
        return res.json({
          success: true,
          platform: platform.name,
          fromCache: true,
          data: cachedData,
        });
      }
    }

    const data = await platform.check(username.trim());
    
    // Store in cache for 24 hours (86400 seconds)
    if (data && data.exists !== false) {
      await cache.set(cacheKey, data, 86400);
    } else if (data && data.exists === false) {
      // Cache non-existent accounts for shorter time (1 hour)
      await cache.set(cacheKey, data, 3600);
    }

    res.json({
      success: true,
      platform: platform.name,
      fromCache: false,
      data,
    });
  } catch (err) {
    next(err);
  }
});

// Error handler
router.use((err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
  }

  console.error('Unexpected error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
});

module.exports = router;
