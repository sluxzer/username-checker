const fs = require('fs');
const path = require('path');

const platforms = new Map();

const files = fs.readdirSync(__dirname)
  .filter(f => f !== 'index.js' && f.endsWith('.js'));

for (const file of files) {
  const mod = require(path.join(__dirname, file));
  if (mod.name && mod.check) {
    platforms.set(mod.name, mod);
  }
}

function getPlatform(name) {
  return platforms.get(name) || null;
}

function listPlatforms() {
  return Array.from(platforms.values());
}

module.exports = { getPlatform, listPlatforms };
