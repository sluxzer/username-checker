const express = require('express');
const checkRoute = require('../src/routes/check');

const app = express();

app.use(express.json());
app.use('/api/check', checkRoute);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = app;
