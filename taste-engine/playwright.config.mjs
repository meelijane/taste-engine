import { defineConfig, devices } from '@playwright/test';

const PORT = 8777;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: { timeout: 8000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'off'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ],
  webServer: {
    command: 'node server.js',
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: true,
    timeout: 20000
  }
});
