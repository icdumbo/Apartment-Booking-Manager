import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./checks',outputDir:'test-results',use:{baseURL:'http://127.0.0.1:8080',browserName:'chromium'},webServer:{command:'python3 -m http.server 8080',url:'http://127.0.0.1:8080',reuseExistingServer:!process.env.CI},reporter:'list'});
