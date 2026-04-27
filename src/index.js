const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Conditionally load check route - will be added in Task 8
try {
  const checkRoute = require('./routes/check');
  app.use('/api/check', checkRoute);
} catch (e) {
  console.log('Note: /api/check route not yet implemented');
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Account Checker API running on port ${PORT}`);
});

module.exports = app;
