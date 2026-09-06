import { test, expect } from '@playwright/test';

/**
 * Smoke gate, extended through M2-03.
 *
 * Page-level guarantees:
 *   - `/agentviz/`                          Chinese homepage renders, brand + course map copy intact.
 *   - `/agentviz/learn/`                    Course index lists both MVP lessons.
 *   - `/agentviz/learn/e01-request-journey/`  Lesson page renders its body and at least one source link.
 *   - `/agentviz/learn/e02-token-anatomy/`    Token counter island reacts to real clicks.
 *   - `/agentviz/learn/a02-agent-episode/`    Episode-replay island hydrates and steps on real clicks.
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
			page.getByText('🚧 站点建设中，已上线 6 门课程，更多持续扩充中', { exact: true })
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

		// "MVP 首发" appears on exactly the three MVP modules (E, R, A).
		await expect(page.getByText('MVP 首发', { exact: true })).toHaveCount(3);

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

	test('R01 lesson page renders swimlane demo and steps through playback', async ({ page }) => {
		const response = await page.goto('/agentviz/learn/r01-rag-pipeline/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/learn/r01-rag-pipeline/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'R01 RAG 全景流水线' })
		).toBeVisible();

		// Swimlane demo island: dual-channel narration (offline indexing vs
		// online query), 7 lanes / 17 events, progress starts at 0/17.
		const demo = page.getByRole('region', { name: '泳道时间轴' });
		await expect(demo).toBeVisible();
		await expect(demo.getByText('0/17')).toBeVisible();
		await expect(demo.getByText('建库').first()).toBeVisible();
		await expect(demo.getByText('开卷').first()).toBeVisible();

		// Real clicks on the playback controls — deterministic single stepping,
		// no reliance on the 1200 ms autoplay cadence.
		await page.waitForFunction(() => {
			const island = document.querySelector('astro-island');
			return island !== null && !island.hasAttribute('ssr');
		});
		await demo.getByRole('button', { name: '单步前进' }).click();
		await expect(demo.getByText('1/17')).toBeVisible();
		await demo.getByRole('button', { name: '单步后退' }).click();
		await expect(demo.getByText('0/17')).toBeVisible();

		// Sources list lives in the article footer.
		const sourceLinks = page.locator('footer a[href^="https://"]');
		await expect(sourceLinks.first()).toBeVisible();
	});

	test('E03 sampling lab responds to real sampling clicks', async ({ page }) => {
		const response = await page.goto('/agentviz/learn/e03-sampling-lab/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/learn/e03-sampling-lab/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'E03 采样实验室：temperature、top-p 与 top-k' })
		).toBeVisible();

		// Wait for the SamplingLab island to hydrate, then sample twice for real.
		await page.waitForFunction(() => {
			const island = document.querySelector('astro-island');
			return island !== null && !island.hasAttribute('ssr');
		});
		const sampleButton = page.getByRole('button', { name: '按当前分布采样一次' });
		await sampleButton.click();
		await sampleButton.click();
		await expect(page.getByText('已采样 2 个 token')).toBeVisible();
		const output = page.locator("p[aria-live='polite']");
		await expect(output).toHaveText(/^今天天气真/);

		await page.getByRole('button', { name: '重置生成输出' }).click();
		await expect(output).toHaveText('今天天气真');
	});

	// M2-02: the E02 token counter is an interactive island — render-green is not
	// click-green. Real clicks on the group buttons and the cost input prove the
	// island hydrated and reacts.
	test('E02 token counter responds to real clicks', async ({ page }) => {
		const response = await page.goto('/agentviz/learn/e02-token-anatomy/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/learn/e02-token-anatomy/ status').toBe(200);

		await expect(page.getByRole('heading', { level: 1, name: 'E02 token 解剖' })).toBeVisible();

		// The island hydrates on client:visible; scroll it into view first. The
		// click-and-assert loop tolerates a click landing before hydration
		// finishes — it simply clicks again until Vue has taken over.
		const numButton = page.getByRole('button', { name: /数字与单号/ });
		await numButton.scrollIntoViewIfNeeded();
		await expect(async () => {
			await numButton.click();
			await expect(numButton).toHaveAttribute('aria-pressed', 'true', { timeout: 1000 });
		}).toPass();

		// The token strip of the "数字与单号" group must show exactly its
		// tokenCount (16) segments, and the summary line mentions the count.
		const strip = page.locator('[aria-label="token 切分条"]');
		await expect(strip.locator('span')).toHaveCount(16);
		const panel = page.locator('[aria-label="token 解析面板"]');
		await expect(panel.getByText(/token 数 16/)).toBeVisible();

		// Cost card: 5000 requests × 16 tokens × ¥4/M = ¥0.3200.
		const requestsInput = panel.getByLabel('请求数（次）');
		await requestsInput.fill('5000');
		await expect(panel.getByText('输入成本 ≈ ¥0.3200')).toBeVisible();

		// Sources list lives in the article footer; at least one external link.
		const sourceLinks = page.locator('footer a[href^="https://"]');
		expect(await sourceLinks.count()).toBeGreaterThanOrEqual(1);
	});

	// M2-03: A02's lesson is mostly its swimlane episode replay. Note the Vue
	// island is server-rendered, so the lane labels and the `0/13` badge are in
	// the DOM before hydration — their visibility proves the demo *payload*
	// arrived (an empty `import.meta.glob` match drops the whole section), not
	// that the island is live. The click assertions therefore wait on hydration
	// explicitly: `astro-island` carries `ssr` until the client runtime mounts
	// the component, and a click on a pre-hydration button is silently swallowed.
	test('A02 lesson page renders episode replay and steps through it', async ({ page }) => {
		const response = await page.goto('/agentviz/learn/a02-agent-episode/');
		expect(response, 'navigation response').not.toBeNull();
		expect(
			response!.status(),
			'GET /agentviz/learn/a02-agent-episode/ status'
		).toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'A02 一次完整任务回放' })
		).toBeVisible();

		const demo = page.getByRole('region', { name: '泳道时间轴' });
		await expect(demo).toBeVisible();

		for (const lane of ['用户', 'Agent 循环', '工具集', '网页 API', 'LLM']) {
			await expect(demo.getByText(lane, { exact: true })).toBeVisible();
		}

		// Initial progress: nothing stepped yet, 13 events in the episode.
		const progress = demo.locator('span[aria-label="播放进度"]');
		await expect(progress).toHaveText('0/13');

		await expect(demo.getByText('思考调用').first()).toBeVisible();
		await expect(demo.getByText('停止条件').first()).toBeVisible();

		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);

		await demo.getByRole('button', { name: '单步前进' }).click();
		await expect(progress).toHaveText('1/13');

		await demo.getByRole('button', { name: '单步后退' }).click();
		await expect(progress).toHaveText('0/13');

		const sourceLinks = page.locator('footer a[href^="https://"]');
		await expect(sourceLinks.first()).toBeVisible();
		expect(await sourceLinks.count()).toBeGreaterThanOrEqual(1);
		await expect(sourceLinks.first()).toHaveAttribute('target', '_blank');
	});

	// M2-05 S2: A01 gets its ReAct loop demo (8 events, 4 lanes). Same pattern
	// as A02: SSR renders lane labels and the `0/8` badge; clicks wait on the
	// hydration gate (`astro-island[ssr]` gone) before stepping.
	test('A01 lesson page renders ReAct loop demo', async ({ page }) => {
		const response = await page.goto('/agentviz/learn/a01-agent-loop/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/learn/a01-agent-loop/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'A01 Agent = LLM + 循环 + 工具' })
		).toBeVisible();

		const demo = page.getByRole('region', { name: '泳道时间轴' });
		await expect(demo).toBeVisible();

		const progress = demo.locator('span[aria-label="播放进度"]');
		await expect(progress).toHaveText('0/8');

		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);

		await demo.getByRole('button', { name: '单步前进' }).click();
		await expect(progress).toHaveText('1/8');

		await demo.getByRole('button', { name: '单步后退' }).click();
		await expect(progress).toHaveText('0/8');
	});

	// M2-05 S5: the English site is a real surface — homepage copy, the header
	// locale switcher, and round-trip navigation are all asserted for real.
	test('English homepage and language toggle work end to end', async ({ page }) => {
		const response = await page.goto('/agentviz/en/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/en/ status').toBe(200);

		await expect(page.locator('h1', { hasText: 'AgentViz' })).toBeVisible();
		await expect(
			page.getByText('Interactive visual tours of AI application development', { exact: true })
		).toBeVisible();
		await expect(
			page.getByText('🚧 Site under construction — 6 lessons live, more on the way.', {
				exact: true
			})
		).toBeVisible();

		// The R module card renders its English blurb and CTA. (Substring match:
		// the blurb is the full sentence "Open-book exams for models: retrieval,
		// chunking, reranking".)
		await expect(page.getByText('Open-book exams for models')).toBeVisible();
		await expect(page.getByText('Start the lesson →', { exact: true }).first()).toBeVisible();

		// Round trip through the header language switcher: EN page → 中文 →
		// zh homepage → EN → back to the English homepage.
		await page.getByRole('link', { name: '切换到中文' }).click();
		await expect(page).toHaveURL(/\/agentviz\/$/);
		await page.getByRole('link', { name: 'Switch to English' }).click();
		await expect(page).toHaveURL(/\/agentviz\/en\/$/);
	});

	test('English course index lists all six lessons', async ({ page }) => {
		const response = await page.goto('/agentviz/en/learn/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/en/learn/ status').toBe(200);

		await expect(page.getByRole('heading', { level: 1, name: 'Courses' })).toBeVisible();

		const titles = [
			'The Journey of a Request',
			'Token Anatomy',
			'The Sampling Lab: temperature, top-p, and top-k',
			'An Agent = LLM + Loop + Tools',
			'Replaying a Full Task Episode',
			'The RAG Pipeline, End to End'
		];
		for (const title of titles) {
			await expect(page.getByRole('heading', { level: 3, name: title })).toBeVisible();
		}
	});

	test('English lesson page renders demo with localized UI', async ({ page }) => {
		const response = await page.goto('/agentviz/en/learn/e01-request-journey/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/en/learn/e01-request-journey/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'The Journey of a Request' })
		).toBeVisible();

		// The swimlane island renders with its English UI dictionary.
		const demo = page.getByRole('region', { name: 'Swim lane timeline' });
		await expect(demo).toBeVisible();
		const progress = demo.locator('span[aria-label="Playback progress"]');
		await expect(progress).toHaveText('0/10');

		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);
		await demo.getByRole('button', { name: 'Step forward' }).click();
		await expect(progress).toHaveText('1/10');

		// Sources list lives in the article footer.
		const sourceLinks = page.locator('footer a[href^="https://"]');
		await expect(sourceLinks.first()).toBeVisible();
		expect(await sourceLinks.count()).toBeGreaterThanOrEqual(1);
	});
});
