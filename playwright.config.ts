import { defineConfig, devices } from '@playwright/test';
process.env.NO_PROXY = [process.env.NO_PROXY, 'localhost,127.0.0.1,::1'].filter(Boolean).join(',');
process.env.no_proxy = process.env.NO_PROXY;
export default defineConfig({
  testDir: './tests', fullyParallel: true, workers: 2, timeout: 45000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:4322', trace: 'retain-on-failure' },
  projects: [
    { name:'desktop', use:{viewport:{width:1440,height:1000}} },
    { name:'mobile', use:{...devices['iPhone 13'],defaultBrowserType:'chromium'} },
  ],
  webServer: { command:'npm run preview -- --host 127.0.0.1 --port 4322', url:'http://127.0.0.1:4322', reuseExistingServer: !process.env.CI },
});
