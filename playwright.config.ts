import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright smoke gate for the static site produced by `astro build` and served
 * by `astro preview`. Runs only Chromium; broader matrix is out of scope for
 * the M1-02 milestone.
 *
 * Astro's preview server listens on http://localhost:4321 by default. The site
 * itself is mounted under the GitHub Pages sub-path `/agentviz` (set via
 * `base` in `astro.config.mjs`).
 *
 * `baseURL` is set to the preview origin on purpose. Playwright resolves
 * relative `page.goto('/...')` calls with `new URL(path, baseURL)`, which means
 * a baseURL with a path component (e.g. `/agentviz`) would be replaced by
 * absolute paths. Keeping baseURL as the bare origin lets the tests express
 * the full site path explicitly (`/agentviz/`, `/agentviz/learn/`, …).
 */
export default defineConfig({
	testDir: './tests',
	// Single spec, single project — run serially to keep the preview server happy.
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: 0,
	workers: 1,
	reporter: [['list']],
	use: {
		baseURL: 'http://localhost:4321',
		// Network-class failures should fail loudly instead of silently bumping
		// past a flaky 30s default. `actionTimeout` covers clicks / fills; the
		// `page.waitForFunction` and the `astro-island[ssr]` hydration gate
		// that several specs use both inherit it too.
		actionTimeout: 10_000,
		// `navigationTimeout` caps `page.goto`; the preview webServer's
		// startup budget is still controlled by `webServer.timeout` (120s).
		navigationTimeout: 15_000,
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure'
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
	],
	webServer: {
		command: 'pnpm run preview',
		// Wait for the Chinese homepage to respond; once `/agentviz/` is up the
		// rest of the site (including `/en/`) is statically built and equally
		// available.
		url: 'http://localhost:4321/agentviz/',
		timeout: 120_000,
		reuseExistingServer: !process.env.CI,
		stdout: 'ignore',
		stderr: 'pipe'
	}
});
