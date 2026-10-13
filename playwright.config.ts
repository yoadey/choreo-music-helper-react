import { defineConfig, devices } from '@playwright/test'
import { existsSync } from 'node:fs'

const basePath = process.env.BASE_PATH ?? ''
const port = Number(process.env.PORT ?? 8081)
// Pre-installed browser in some environments, otherwise the one installed by `npx playwright install`
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined)

export default defineConfig({
    testDir: 'e2e',
    timeout: 60_000,
    fullyParallel: false,
    workers: 1,
    retries: 0,
    reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
    use: {
        baseURL: `http://localhost:${port}${basePath}/`,
        trace: 'retain-on-failure',
        locale: 'de-DE',
        launchOptions: {
            executablePath,
            args: ['--autoplay-policy=no-user-gesture-required'],
        },
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: undefined } }],
    webServer: {
        command: 'node e2e/server.mjs',
        url: `http://localhost:${port}${basePath}/`,
        reuseExistingServer: !process.env.CI,
        env: { BASE_PATH: basePath, PORT: String(port) },
    },
})
