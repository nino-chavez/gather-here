const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: '.', testMatch: '**/*.spec.cjs', timeout: 30000, workers: 2,
  use: { baseURL: process.env.BASE_URL || 'http://127.0.0.1:8796', headless: true },
  reporter: 'list', outputDir: '../test-results'
});
