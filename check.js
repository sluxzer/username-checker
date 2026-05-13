#!/usr/bin/env node

const { getPlatform, getPlatforms } = require('./src/platforms');

const args = process.argv.slice(2);
const platformName = args[0];
const username = args[1];
const isDebug = args.includes('--debug');

if (!platformName || !username) {
  console.log('Usage: node check.js <platform> <username> [--debug]');
  console.log('Available platforms: ' + getPlatforms().join(', '));
  process.exit(1);
}

async function run() {
  const platform = getPlatform(platformName);
  if (!platform) {
    console.error(`Platform "${platformName}" not found.`);
    process.exit(1);
  }

  console.log(`Checking ${platform.label} for "${username}"...`);

  if (isDebug && platformName === 'instagram') {
    // Specialized debug for Instagram to see fallbacks
    const ig = require('./src/platforms/instagram');
    const methods = [
      { name: 'Web API', fn: ig.checkViaAPI },
      { name: 'Mobile API', fn: ig.checkViaMobileAPI },
      { name: 'Instrack API', fn: ig.checkViaInstrack },
      { name: 'Embed Page', fn: ig.checkViaEmbed },
      { name: 'Scraping', fn: ig.checkViaScraping }
    ];

    console.log('\n--- Debug Mode: Individual Methods ---');
    for (const m of methods) {
      try {
        process.stdout.write(`Testing ${m.name.padEnd(15)}: `);
        const start = Date.now();
        const res = await m.fn(username);
        const time = Date.now() - start;
        if (res && res.exists) {
          console.log(`✅ SUCCESS (${time}ms)`);
        } else {
          console.log(`❌ FAILED (${time}ms)`);
        }
      } catch (err) {
        console.log(`⚠️ ERROR (${err.message})`);
      }
    }
    console.log('--------------------------------------\n');
  }

  try {
    const start = Date.now();
    const result = await platform.check(username);
    const duration = Date.now() - start;

    console.log('--- Final Result ---');
    console.log(`Exists:    ${result.exists ? '✅ Yes' : '❌ No'}`);
    if (result.exists) {
      console.log(`Name:      ${result.username}`);
      console.log(`Followers: ${result.stats.followers?.toLocaleString() || 'N/A'}`);
      console.log(`Following: ${result.stats.following?.toLocaleString() || 'N/A'}`);
      console.log(`Posts:     ${result.stats.posts?.toLocaleString() || 'N/A'}`);
      console.log(`Verified:  ${result.verified ? '🌟 Yes' : 'No'}`);
      if (result.extras?.bio) console.log(`Bio:       ${result.extras.bio}`);
      if (result.raw?.externalUrl) console.log(`Website:   ${result.raw.externalUrl}`);
    }
    console.log(`Time:      ${duration}ms`);
    console.log('--------------------');

  } catch (err) {
    console.error('Fatal Error:', err.message);
    if (err.name === 'RateLimitedError') {
        console.error('Status: Rate Limited 🛑');
    }
  }
}

run();
