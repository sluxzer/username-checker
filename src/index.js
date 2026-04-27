const express = require('express');
const checkRoute = require('./routes/check');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/api/check', checkRoute);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Account Checker API running on port ${PORT}`);
});

module.exports = app;
