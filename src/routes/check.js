const express = require('express');
const router = express.Router();
const { getPlatform, listPlatforms } = require('../platforms');
const { AppError } = require('../utils/errors');

// List all supported platforms
router.get('/', (req, res) => {
  const platforms = listPlatforms().map(p => ({ name: p.name, label: p.label }));
  res.json({ platforms });
});

// Check a username on a platform
router.get('/:platform/:username', async (req, res, next) => {
  const { platform: platformName, username } = req.params;

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

  try {
    const data = await platform.check(username.trim());
    res.json({
      success: true,
      platform: platform.name,
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
