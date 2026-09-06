import { test, expect } from '@playwright/test';

/**
 * M1-02 smoke gate.
 *
 * Three pages, three guarantees:
 *   - `/agentviz/`                          Chinese homepage renders, brand + course map copy intact.
 *   - `/agentviz/learn/`                    Course index lists both MVP lessons.
 *   - `/agentviz/learn/e01-request-journey/`  Lesson page renders its body and at least one source link.
 *
 * The Chinese homepage screenshot is captured as a permanent artifact for the
 * milestone report at `tests/screenshots/home.png`; the other two pages only
 * need a passing 200 + copy check.
 */

const SCREENSHOT_PATH = 'tests/screenshots/home.png';

test.describe('AgentViz smoke gate', () => {
	test('Chinese homepage renders with course map copy', async ({ page }) => {
		const response = await page.goto('/agentviz/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/ status').toBe(200);

		// Brand.
		await expect(page.locator('h1', { hasText: 'AgentViz' })).toBeVisible();
		// Hero tagline (Chinese) — the page-level copy stays Chinese because i18n
		// is configured with `prefixDefaultLocale: false`.
		await expect(
			page.getByText('Interactive visual tours of AI application development', { exact: true })
		).toBeVisible();
		await expect(
			page.getByText('把 AI 应用开发中看不见的 API 调用、Agent 循环与数据流，变成可播放、可交互的动画', {
				exact: true
			})
		).toBeVisible();
		// Construction notice.
		await expect(
			page.getByText('🚧 站点建设中，首两门课程 E01 / A01 即将上线', { exact: true })
		).toBeVisible();

		// All six module names, in both Chinese (primary heading) and English (subhead).
		const zhModules = [
			'地基：和 LLM 对话',
			'Prompt 工程',
			'Tool Calling',
			'RAG',
			'Agent',
			'工程化'
		];
		const enModules = [
			'LLM Foundations',
			'Prompt Engineering',
			'Tool Calling',
			'Retrieval-Augmented Generation',
			'Agents & MCP',
			'Production Engineering'
		];

		for (const name of [...zhModules, ...enModules]) {
			// `Tool Calling` appears twice (zh h3 + en subhead); the others appear
			// once. `.first()` is safe either way and avoids strict-mode violations.
			await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
		}

		// "MVP 首发" appears on exactly the two MVP modules (E, A).
		await expect(page.getByText('MVP 首发', { exact: true })).toHaveCount(2);

		// MVP cards are real links to their launch lessons (M1-05: no more `#`).
		const eCard = page.getByRole('link', { name: /地基：和 LLM 对话/ });
		await expect(eCard).toHaveAttribute('href', /\/agentviz\/learn\/e01-request-journey\//);
		const aCard = page.getByRole('link', { name: /Agents & MCP/ });
		await expect(aCard).toHaveAttribute('href', /\/agentviz\/learn\/a01-agent-loop\//);

		// Footer GitHub link points at the real repository, not a placeholder.
		const githubLink = page.getByRole('link', { name: 'GitHub' });
		await expect(githubLink).toHaveAttribute('href', 'https://github.com/classkow/agentviz');
		await expect(githubLink).toHaveAttribute('target', '_blank');

		// Permanent full-page screenshot for the milestone report.
		// Path is relative to the project root (Playwright resolves it against
		// `process.cwd()`).
		await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
	});

	// M1-05: render-green is not click-green. Real clicks prove the links work.
	test('Homepage links navigate to real pages', async ({ page }) => {
		await page.goto('/agentviz/');

		// Header nav link to the course index. Desktop and mobile navs both
		// render it, so `.first()` avoids strict-mode violations.
		await page.getByRole('link', { name: '课程' }).first().click();
		await expect(page).toHaveURL(/\/agentviz\/learn/);

		// E module card is a whole-card link to its launch lesson.
		await page.goto('/agentviz/');
		await page.getByRole('link', { name: /地基：和 LLM 对话/ }).click();
		await expect(page).toHaveURL(/\/agentviz\/learn\/e01-request-journey/);
	});

	test('Learn index lists MVP lessons', async ({ page }) => {
		const response = await page.goto('/agentviz/learn/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/learn/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: '课程' })
		).toBeVisible();
		await expect(
			page.getByRole('heading', { level: 3, name: 'E01 一次请求的旅程' })
		).toBeVisible();
		await expect(
			page.getByRole('heading', { level: 3, name: 'A01 Agent = LLM + 循环 + 工具' })
		).toBeVisible();
	});

	test('Lesson page renders body and at least one source link', async ({ page }) => {
		const response = await page.goto('/agentviz/learn/e01-request-journey/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/learn/e01-request-journey/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'E01 一次请求的旅程' })
		).toBeVisible();

		// Sources list lives in the article footer; at least one external link
		// must be present and open in a new tab.
		const sourceLinks = page.locator('footer a[href^="https://"]');
		await expect(sourceLinks.first()).toBeVisible();
		expect(await sourceLinks.count()).toBeGreaterThanOrEqual(1);
		await expect(sourceLinks.first()).toHaveAttribute('target', '_blank');
	});
});
