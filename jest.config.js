module.exports = {
  testEnvironment: 'node',
  moduleDirectories: ['node_modules', '.'],
  testMatch: ['**/tests/**/*.test.js'],
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  transformIgnorePatterns: [
    // This pattern tells Jest to ignore files in node_modules UNLESS they match the regex.
    // The pattern "/<rootDir>\/node_modules\/(?!.*\\.(js|mjs)$)/" means:
    // Ignore node_modules UNLESS the file ends with .js or .mjs.
    // This ensures that JS and MJS files from node_modules are processed by Babel.
    "<rootDir>/node_modules/(?!.*\\\\.(js|mjs)$)",
  ],
  moduleNameMapper: {
    // Mock 'https-proxy-agent' to bypass the ES Module import issue during tests.
    "^https-proxy-agent$": "<rootDir>/tests/mocks/https-proxy-agent.mock.js",
  },
};

