import { test, expect } from '@playwright/test';

/**
 * Smoke gate, extended through M3 S0.
 *
 * Page-level guarantees:
 *   - `/agentviz/`                          Chinese homepage renders, brand + course map copy intact.
 *   - `/agentviz/learn/`                    Course index lists both MVP lessons.
 *   - `/agentviz/learn/e01-request-journey/`  Lesson page renders its body and at least one source link.
 *   - `/agentviz/learn/e02-token-anatomy/`    Token counter island reacts to real clicks.
 *   - `/agentviz/learn/a02-agent-episode/`    Episode-replay island hydrates and steps on real clicks.
 *   - `/agentviz/en/learn/e03-sampling-lab/`  English sampling lab reacts to real clicks (localized UI).
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
			page.getByText('🚧 站点建设中，已上线 27 门课程，更多持续扩充中', { exact: true })
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
			page.getByText('🚧 Site under construction — 27 lessons live, more on the way.', {
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

	// M3 S0: the English sampling lab is an interactive island — render-green is
	// not click-green. Real clicks on the localized buttons prove the English UI
	// dictionary is wired end to end. Mirrors the Chinese E03 test: sample once,
	// assert the counter and the appended token, then reset and assert the
	// output area is cleared back to the bare prompt.
	test('English sampling lab responds to real sampling clicks', async ({ page }) => {
		const response = await page.goto('/agentviz/en/learn/e03-sampling-lab/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/en/learn/e03-sampling-lab/ status').toBe(200);

		await expect(
			page.getByRole('heading', {
				level: 1,
				name: 'The Sampling Lab: temperature, top-p, and top-k'
			})
		).toBeVisible();

		// Hydration gate: `astro-island` carries `ssr` until the client runtime
		// mounts the component; a pre-hydration click would be silently dropped.
		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);

		// The output area starts with the bare prompt text and an empty counter.
		const output = page.locator("p[aria-live='polite']");
		await expect(output).toHaveText('今天天气真');
		await expect(page.getByText('0 tokens sampled')).toBeVisible();

		// Sample once for real (accessible names come from the English
		// aria-labels, matching the pattern of the Chinese E03 test).
		await page.getByRole('button', { name: 'Sample once from the current distribution' }).click();
		await expect(page.getByText('1 tokens sampled')).toBeVisible();
		// A sampled token is appended after the prompt text.
		await expect(output).toHaveText(/^今天天气真.+/);

		// Reset clears the output back to the bare prompt.
		await page.getByRole('button', { name: 'Reset the generated output' }).click();
		await expect(page.getByText('0 tokens sampled')).toBeVisible();
		await expect(output).toHaveText('今天天气真');
	});

	// M3 S1: E04 window ledger is a token-type island. Same pattern as E02:
	// select a non-default group (proves hydration), then assert the exact
	// constructed numbers from src/demos/e04-context-window.json.
	test('E04 context window ledger responds to real clicks', async ({ page }) => {
		const response = await page.goto('/agentviz/learn/e04-context-window/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/learn/e04-context-window/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'E04 上下文窗口：有上限的短期记忆' })
		).toBeVisible();

		// Click the non-default "输出预留" group until Vue has taken over
		// (aria-pressed flips only after hydration).
		const reserveButton = page.getByRole('button', { name: /输出预留/ });
		await reserveButton.scrollIntoViewIfNeeded();
		await expect(async () => {
			await reserveButton.click();
			await expect(reserveButton).toHaveAttribute('aria-pressed', 'true', { timeout: 1000 });
		}).toPass();

		const panel = page.locator('[aria-label="token 解析面板"]');
		await expect(panel.getByText(/token 数 2048/)).toBeVisible();

		// 5000 requests × 2048 tokens × ¥4/M = ¥40.9600.
		const requestsInput = panel.getByLabel('请求数（次）');
		await requestsInput.fill('5000');
		await expect(panel.getByText('输入成本 ≈ ¥40.9600')).toBeVisible();

		// Switch to the system prompt group: 5000 × 1400 × ¥4/M = ¥28.0000.
		await page.getByRole('button', { name: /system 提示/ }).click();
		await expect(panel.getByText(/token 数 1400/)).toBeVisible();
		await expect(panel.getByText('输入成本 ≈ ¥28.0000')).toBeVisible();

		const sourceLinks = page.locator('footer a[href^="https://"]');
		expect(await sourceLinks.count()).toBeGreaterThanOrEqual(1);
	});

	// M3 S1: E05 cost breakdown — three plans on one billing bench. Same
	// pattern: hydrate via a non-default group, then exact-value assertions.
	test('E05 cost breakdown responds to real clicks', async ({ page }) => {
		const response = await page.goto('/agentviz/learn/e05-cost-breakdown/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/learn/e05-cost-breakdown/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'E05 计费与成本：每个 token 都要钱' })
		).toBeVisible();

		const planBButton = page.getByRole('button', { name: /方案 B/ });
		await planBButton.scrollIntoViewIfNeeded();
		await expect(async () => {
			await planBButton.click();
			await expect(planBButton).toHaveAttribute('aria-pressed', 'true', { timeout: 1000 });
		}).toPass();

		const panel = page.locator('[aria-label="token 解析面板"]');
		await expect(panel.getByText(/token 数 1500/)).toBeVisible();

		// 100000 requests × 1500 tokens × ¥4/M = ¥600.0000 (input side).
		const requestsInput = panel.getByLabel('请求数（次）');
		await requestsInput.fill('100000');
		await expect(panel.getByText('输入成本 ≈ ¥600.0000')).toBeVisible();

		// Plan A has fewer input tokens (900): 100000 × 900 × ¥4/M = ¥360.0000.
		await page.getByRole('button', { name: /方案 A/ }).click();
		await expect(panel.getByText(/token 数 900/)).toBeVisible();
		await expect(panel.getByText('输入成本 ≈ ¥360.0000')).toBeVisible();

		// Plan C shares plan B's raw input count — the cache story lives in its
		// note (1200 tokens hit the cache at 1/10 rate).
		await page.getByRole('button', { name: /方案 C/ }).click();
		await expect(panel.getByText('输入成本 ≈ ¥600.0000')).toBeVisible();
		await expect(panel.getByText(/1\/10 折算/)).toBeVisible();

		const sourceLinks = page.locator('footer a[href^="https://"]');
		expect(await sourceLinks.count()).toBeGreaterThanOrEqual(1);
	});

	// M3 S1: English E04 page — localized token bench, English button, and the
	// exact same constructed numbers as the Chinese page.
	test('English E04 lesson page renders token ledger with localized UI', async ({ page }) => {
		const response = await page.goto('/agentviz/en/learn/e04-context-window/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/en/learn/e04-context-window/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'The Context Window: a contract with limits' })
		).toBeVisible();

		// The token bench renders with its English UI dictionary.
		const bench = page.locator('[aria-label="Token anatomy bench"]');
		await expect(bench).toBeVisible();

		const reserveButton = page.getByRole('button', { name: /Output reserve/ });
		await reserveButton.scrollIntoViewIfNeeded();
		await expect(async () => {
			await reserveButton.click();
			await expect(reserveButton).toHaveAttribute('aria-pressed', 'true', { timeout: 1000 });
		}).toPass();
		await expect(page.getByText(/tokens 2048/)).toBeVisible();

		// 5000 requests × 2048 tokens × ¥4/M = ¥40.9600.
		const requestsInput = page.getByLabel('Requests');
		await requestsInput.fill('5000');
		await expect(page.getByText('Estimated input cost ≈ ¥40.9600')).toBeVisible();

		const sourceLinks = page.locator('footer a[href^="https://"]');
		expect(await sourceLinks.count()).toBeGreaterThanOrEqual(1);
	});

	// M3 S1: English E05 page — same bench, English plan buttons, exact numbers.
	test('English E05 lesson page renders cost breakdown with localized UI', async ({ page }) => {
		const response = await page.goto('/agentviz/en/learn/e05-cost-breakdown/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/en/learn/e05-cost-breakdown/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'The Cost of a Token' })
		).toBeVisible();

		const bench = page.locator('[aria-label="Token anatomy bench"]');
		await expect(bench).toBeVisible();

		const planBButton = page.getByRole('button', { name: /Plan B/ });
		await planBButton.scrollIntoViewIfNeeded();
		await expect(async () => {
			await planBButton.click();
			await expect(planBButton).toHaveAttribute('aria-pressed', 'true', { timeout: 1000 });
		}).toPass();
		await expect(page.getByText(/tokens 1500/)).toBeVisible();

		// 100000 requests × 1500 tokens × ¥4/M = ¥600.0000 (input side).
		const requestsInput = page.getByLabel('Requests');
		await requestsInput.fill('100000');
		await expect(page.getByText('Estimated input cost ≈ ¥600.0000')).toBeVisible();

		const sourceLinks = page.locator('footer a[href^="https://"]');
		expect(await sourceLinks.count()).toBeGreaterThanOrEqual(1);
	});

	// M3 S2: T01 function calling — swimlane demo, 5 lanes / 11 events. SSR
	// renders the lane labels and `0/11` badge; clicks wait on the hydration
	// gate (`astro-island[ssr]` gone) before stepping.
	test('T01 lesson page renders swimlane demo and steps through playback', async ({ page }) => {
		const response = await page.goto('/agentviz/learn/t01-function-calling/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/learn/t01-function-calling/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'T01 函数调用：模型申请，客户端执行' })
		).toBeVisible();

		const demo = page.getByRole('region', { name: '泳道时间轴' });
		await expect(demo).toBeVisible();
		const progress = demo.locator('span[aria-label="播放进度"]');
		await expect(progress).toHaveText('0/11');

		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);

		await demo.getByRole('button', { name: '单步前进' }).click();
		await expect(progress).toHaveText('1/11');

		await demo.getByRole('button', { name: '单步后退' }).click();
		await expect(progress).toHaveText('0/11');
	});

	// M3 S2: T02 parallel tool calls — swimlane demo, 5 lanes / 13 events.
	test('T02 lesson page renders swimlane demo and steps through playback', async ({ page }) => {
		const response = await page.goto('/agentviz/learn/t02-parallel-tools/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/learn/t02-parallel-tools/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'T02 并行工具调用：一批申请同时执行' })
		).toBeVisible();

		const demo = page.getByRole('region', { name: '泳道时间轴' });
		await expect(demo).toBeVisible();
		const progress = demo.locator('span[aria-label="播放进度"]');
		await expect(progress).toHaveText('0/13');

		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);

		await demo.getByRole('button', { name: '单步前进' }).click();
		await expect(progress).toHaveText('1/13');

		await demo.getByRole('button', { name: '单步后退' }).click();
		await expect(progress).toHaveText('0/13');
	});

	// M3 S2: T03 tool failures and retries — swimlane demo, 5 lanes / 14 events.
	test('T03 lesson page renders swimlane demo and steps through playback', async ({ page }) => {
		const response = await page.goto('/agentviz/learn/t03-tool-failures/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/learn/t03-tool-failures/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'T03 工具失败与重试：当模型的手被烫到' })
		).toBeVisible();

		const demo = page.getByRole('region', { name: '泳道时间轴' });
		await expect(demo).toBeVisible();
		const progress = demo.locator('span[aria-label="播放进度"]');
		await expect(progress).toHaveText('0/14');

		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);

		await demo.getByRole('button', { name: '单步前进' }).click();
		await expect(progress).toHaveText('1/14');

		await demo.getByRole('button', { name: '单步后退' }).click();
		await expect(progress).toHaveText('0/14');
	});

	// M3 S2: English T01 page — localized swimlane UI, one real step forward.
	test('English T01 lesson page renders demo with localized UI', async ({ page }) => {
		const response = await page.goto('/agentviz/en/learn/t01-function-calling/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/en/learn/t01-function-calling/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'Function Calling: the Model Asks, the Client Acts' })
		).toBeVisible();

		const demo = page.getByRole('region', { name: 'Swim lane timeline' });
		await expect(demo).toBeVisible();
		const progress = demo.locator('span[aria-label="Playback progress"]');
		await expect(progress).toHaveText('0/11');

		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);
		await demo.getByRole('button', { name: 'Step forward' }).click();
		await expect(progress).toHaveText('1/11');

		const sourceLinks = page.locator('footer a[href^="https://"]');
		await expect(sourceLinks.first()).toBeVisible();
		expect(await sourceLinks.count()).toBeGreaterThanOrEqual(1);
	});

	// M3 S2: English T02 page — localized swimlane UI, one real step forward.
	test('English T02 lesson page renders demo with localized UI', async ({ page }) => {
		const response = await page.goto('/agentviz/en/learn/t02-parallel-tools/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/en/learn/t02-parallel-tools/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'Parallel Tool Calls' })
		).toBeVisible();

		const demo = page.getByRole('region', { name: 'Swim lane timeline' });
		await expect(demo).toBeVisible();
		const progress = demo.locator('span[aria-label="Playback progress"]');
		await expect(progress).toHaveText('0/13');

		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);
		await demo.getByRole('button', { name: 'Step forward' }).click();
		await expect(progress).toHaveText('1/13');

		const sourceLinks = page.locator('footer a[href^="https://"]');
		await expect(sourceLinks.first()).toBeVisible();
		expect(await sourceLinks.count()).toBeGreaterThanOrEqual(1);
	});

	// M3 S2: English T03 page — localized swimlane UI, one real step forward.
	test('English T03 lesson page renders demo with localized UI', async ({ page }) => {
		const response = await page.goto('/agentviz/en/learn/t03-tool-failures/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/en/learn/t03-tool-failures/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'Tool Failures and Retries' })
		).toBeVisible();

		const demo = page.getByRole('region', { name: 'Swim lane timeline' });
		await expect(demo).toBeVisible();
		const progress = demo.locator('span[aria-label="Playback progress"]');
		await expect(progress).toHaveText('0/14');

		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);
		await demo.getByRole('button', { name: 'Step forward' }).click();
		await expect(progress).toHaveText('1/14');

		const sourceLinks = page.locator('footer a[href^="https://"]');
		await expect(sourceLinks.first()).toBeVisible();
		expect(await sourceLinks.count()).toBeGreaterThanOrEqual(1);
	});

	// M3 S3: P01 structured prompts — swimlane demo, 4 lanes / 12 events.
	test('P01 lesson page renders swimlane demo and steps through playback', async ({ page }) => {
		const response = await page.goto('/agentviz/learn/p01-structured-prompts/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/learn/p01-structured-prompts/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'P01 结构化提示：把需求说清楚' })
		).toBeVisible();

		const demo = page.getByRole('region', { name: '泳道时间轴' });
		await expect(demo).toBeVisible();
		const progress = demo.locator('span[aria-label="播放进度"]');
		await expect(progress).toHaveText('0/12');

		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);

		await demo.getByRole('button', { name: '单步前进' }).click();
		await expect(progress).toHaveText('1/12');

		await demo.getByRole('button', { name: '单步后退' }).click();
		await expect(progress).toHaveText('0/12');
	});

	// M3 S3: P02 few-shot examples — swimlane demo, 4 lanes / 12 events.
	test('P02 lesson page renders swimlane demo and steps through playback', async ({ page }) => {
		const response = await page.goto('/agentviz/learn/p02-few-shot/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/learn/p02-few-shot/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'P02 少样本示例：给模型看几个样子' })
		).toBeVisible();

		const demo = page.getByRole('region', { name: '泳道时间轴' });
		await expect(demo).toBeVisible();
		const progress = demo.locator('span[aria-label="播放进度"]');
		await expect(progress).toHaveText('0/12');

		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);

		await demo.getByRole('button', { name: '单步前进' }).click();
		await expect(progress).toHaveText('1/12');

		await demo.getByRole('button', { name: '单步后退' }).click();
		await expect(progress).toHaveText('0/12');
	});

	// M3 S3: P03 chain of thought — swimlane demo, 4 lanes / 11 events.
	test('P03 lesson page renders swimlane demo and steps through playback', async ({ page }) => {
		const response = await page.goto('/agentviz/learn/p03-chain-of-thought/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/learn/p03-chain-of-thought/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'P03 思维链：让模型先打草稿' })
		).toBeVisible();

		const demo = page.getByRole('region', { name: '泳道时间轴' });
		await expect(demo).toBeVisible();
		const progress = demo.locator('span[aria-label="播放进度"]');
		await expect(progress).toHaveText('0/11');

		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);

		await demo.getByRole('button', { name: '单步前进' }).click();
		await expect(progress).toHaveText('1/11');

		await demo.getByRole('button', { name: '单步后退' }).click();
		await expect(progress).toHaveText('0/11');
	});

	// M3 S3: P04 prompt antipatterns — swimlane demo, 4 lanes / 12 events.
	test('P04 lesson page renders swimlane demo and steps through playback', async ({ page }) => {
		const response = await page.goto('/agentviz/learn/p04-antipatterns/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/learn/p04-antipatterns/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'P04 反模式：prompt 常见的坑' })
		).toBeVisible();

		const demo = page.getByRole('region', { name: '泳道时间轴' });
		await expect(demo).toBeVisible();
		const progress = demo.locator('span[aria-label="播放进度"]');
		await expect(progress).toHaveText('0/12');

		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);

		await demo.getByRole('button', { name: '单步前进' }).click();
		await expect(progress).toHaveText('1/12');

		await demo.getByRole('button', { name: '单步后退' }).click();
		await expect(progress).toHaveText('0/12');
	});

	// M3 S3: English P01 page — localized swimlane UI, one real step forward.
	test('English P01 lesson page renders demo with localized UI', async ({ page }) => {
		const response = await page.goto('/agentviz/en/learn/p01-structured-prompts/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/en/learn/p01-structured-prompts/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'Structured Prompts' })
		).toBeVisible();

		const demo = page.getByRole('region', { name: 'Swim lane timeline' });
		await expect(demo).toBeVisible();
		const progress = demo.locator('span[aria-label="Playback progress"]');
		await expect(progress).toHaveText('0/12');

		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);
		await demo.getByRole('button', { name: 'Step forward' }).click();
		await expect(progress).toHaveText('1/12');

		const sourceLinks = page.locator('footer a[href^="https://"]');
		await expect(sourceLinks.first()).toBeVisible();
		expect(await sourceLinks.count()).toBeGreaterThanOrEqual(1);
	});

	// M3 S3: English P02 page — localized swimlane UI, one real step forward.
	test('English P02 lesson page renders demo with localized UI', async ({ page }) => {
		const response = await page.goto('/agentviz/en/learn/p02-few-shot/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/en/learn/p02-few-shot/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'Few-Shot Examples' })
		).toBeVisible();

		const demo = page.getByRole('region', { name: 'Swim lane timeline' });
		await expect(demo).toBeVisible();
		const progress = demo.locator('span[aria-label="Playback progress"]');
		await expect(progress).toHaveText('0/12');

		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);
		await demo.getByRole('button', { name: 'Step forward' }).click();
		await expect(progress).toHaveText('1/12');

		const sourceLinks = page.locator('footer a[href^="https://"]');
		await expect(sourceLinks.first()).toBeVisible();
		expect(await sourceLinks.count()).toBeGreaterThanOrEqual(1);
	});

	// M3 S3: English P03 page — localized swimlane UI, one real step forward.
	test('English P03 lesson page renders demo with localized UI', async ({ page }) => {
		const response = await page.goto('/agentviz/en/learn/p03-chain-of-thought/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/en/learn/p03-chain-of-thought/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'Chain of Thought' })
		).toBeVisible();

		const demo = page.getByRole('region', { name: 'Swim lane timeline' });
		await expect(demo).toBeVisible();
		const progress = demo.locator('span[aria-label="Playback progress"]');
		await expect(progress).toHaveText('0/11');

		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);
		await demo.getByRole('button', { name: 'Step forward' }).click();
		await expect(progress).toHaveText('1/11');

		const sourceLinks = page.locator('footer a[href^="https://"]');
		await expect(sourceLinks.first()).toBeVisible();
		expect(await sourceLinks.count()).toBeGreaterThanOrEqual(1);
	});

	// M3 S3: English P04 page — localized swimlane UI, one real step forward.
	test('English P04 lesson page renders demo with localized UI', async ({ page }) => {
		const response = await page.goto('/agentviz/en/learn/p04-antipatterns/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/en/learn/p04-antipatterns/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'Prompt Antipatterns' })
		).toBeVisible();

		const demo = page.getByRole('region', { name: 'Swim lane timeline' });
		await expect(demo).toBeVisible();
		const progress = demo.locator('span[aria-label="Playback progress"]');
		await expect(progress).toHaveText('0/12');

		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);
		await demo.getByRole('button', { name: 'Step forward' }).click();
		await expect(progress).toHaveText('1/12');

		const sourceLinks = page.locator('footer a[href^="https://"]');
		await expect(sourceLinks.first()).toBeVisible();
		expect(await sourceLinks.count()).toBeGreaterThanOrEqual(1);
	});

	// M3 S4: R02 embeddings — swimlane demo, 5 lanes / 12 events.
	test('R02 lesson page renders swimlane demo and steps through playback', async ({ page }) => {
		const response = await page.goto('/agentviz/learn/r02-embeddings/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/learn/r02-embeddings/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'R02 语义空间：嵌入与最近邻' })
		).toBeVisible();

		const demo = page.getByRole('region', { name: '泳道时间轴' });
		await expect(demo).toBeVisible();
		const progress = demo.locator('span[aria-label="播放进度"]');
		await expect(progress).toHaveText('0/12');

		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);

		await demo.getByRole('button', { name: '单步前进' }).click();
		await expect(progress).toHaveText('1/12');

		await demo.getByRole('button', { name: '单步后退' }).click();
		await expect(progress).toHaveText('0/12');
	});

	// M3 S4: R03 chunking — swimlane demo, 5 lanes / 13 events.
	test('R03 lesson page renders swimlane demo and steps through playback', async ({ page }) => {
		const response = await page.goto('/agentviz/learn/r03-chunking/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/learn/r03-chunking/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'R03 切块策略：边界决定召回' })
		).toBeVisible();

		const demo = page.getByRole('region', { name: '泳道时间轴' });
		await expect(demo).toBeVisible();
		const progress = demo.locator('span[aria-label="播放进度"]');
		await expect(progress).toHaveText('0/13');

		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);

		await demo.getByRole('button', { name: '单步前进' }).click();
		await expect(progress).toHaveText('1/13');

		await demo.getByRole('button', { name: '单步后退' }).click();
		await expect(progress).toHaveText('0/13');
	});

	// M3 S4: R04 reranking — swimlane demo, 6 lanes / 12 events.
	test('R04 lesson page renders swimlane demo and steps through playback', async ({ page }) => {
		const response = await page.goto('/agentviz/learn/r04-reranking/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/learn/r04-reranking/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'R04 重排序：先召回，再精选' })
		).toBeVisible();

		const demo = page.getByRole('region', { name: '泳道时间轴' });
		await expect(demo).toBeVisible();
		const progress = demo.locator('span[aria-label="播放进度"]');
		await expect(progress).toHaveText('0/12');

		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);

		await demo.getByRole('button', { name: '单步前进' }).click();
		await expect(progress).toHaveText('1/12');

		await demo.getByRole('button', { name: '单步后退' }).click();
		await expect(progress).toHaveText('0/12');
	});

	// M3 S4: R05 RAG evaluation — swimlane demo, 5 lanes / 13 events.
	test('R05 lesson page renders swimlane demo and steps through playback', async ({ page }) => {
		const response = await page.goto('/agentviz/learn/r05-rag-eval/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/learn/r05-rag-eval/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'R05 RAG 评估：开卷考试怎么判卷' })
		).toBeVisible();

		const demo = page.getByRole('region', { name: '泳道时间轴' });
		await expect(demo).toBeVisible();
		const progress = demo.locator('span[aria-label="播放进度"]');
		await expect(progress).toHaveText('0/13');

		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);

		await demo.getByRole('button', { name: '单步前进' }).click();
		await expect(progress).toHaveText('1/13');

		await demo.getByRole('button', { name: '单步后退' }).click();
		await expect(progress).toHaveText('0/13');
	});

	// M3 S4: English R02 page — localized swimlane UI, one real step forward.
	test('English R02 lesson page renders demo with localized UI', async ({ page }) => {
		const response = await page.goto('/agentviz/en/learn/r02-embeddings/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/en/learn/r02-embeddings/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'Semantic Space: Embeddings and Nearest Neighbors' })
		).toBeVisible();

		const demo = page.getByRole('region', { name: 'Swim lane timeline' });
		await expect(demo).toBeVisible();
		const progress = demo.locator('span[aria-label="Playback progress"]');
		await expect(progress).toHaveText('0/12');

		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);
		await demo.getByRole('button', { name: 'Step forward' }).click();
		await expect(progress).toHaveText('1/12');

		const sourceLinks = page.locator('footer a[href^="https://"]');
		await expect(sourceLinks.first()).toBeVisible();
		expect(await sourceLinks.count()).toBeGreaterThanOrEqual(1);
	});

	// M3 S4: English R03 page — localized swimlane UI, one real step forward.
	test('English R03 lesson page renders demo with localized UI', async ({ page }) => {
		const response = await page.goto('/agentviz/en/learn/r03-chunking/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/en/learn/r03-chunking/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'Chunking Strategies' })
		).toBeVisible();

		const demo = page.getByRole('region', { name: 'Swim lane timeline' });
		await expect(demo).toBeVisible();
		const progress = demo.locator('span[aria-label="Playback progress"]');
		await expect(progress).toHaveText('0/13');

		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);
		await demo.getByRole('button', { name: 'Step forward' }).click();
		await expect(progress).toHaveText('1/13');

		const sourceLinks = page.locator('footer a[href^="https://"]');
		await expect(sourceLinks.first()).toBeVisible();
		expect(await sourceLinks.count()).toBeGreaterThanOrEqual(1);
	});

	// M3 S4: English R04 page — localized swimlane UI, one real step forward.
	test('English R04 lesson page renders demo with localized UI', async ({ page }) => {
		const response = await page.goto('/agentviz/en/learn/r04-reranking/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/en/learn/r04-reranking/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'Reranking' })
		).toBeVisible();

		const demo = page.getByRole('region', { name: 'Swim lane timeline' });
		await expect(demo).toBeVisible();
		const progress = demo.locator('span[aria-label="Playback progress"]');
		await expect(progress).toHaveText('0/12');

		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);
		await demo.getByRole('button', { name: 'Step forward' }).click();
		await expect(progress).toHaveText('1/12');

		const sourceLinks = page.locator('footer a[href^="https://"]');
		await expect(sourceLinks.first()).toBeVisible();
		expect(await sourceLinks.count()).toBeGreaterThanOrEqual(1);
	});

	// M3 S4: English R05 page — localized swimlane UI, one real step forward.
	test('English R05 lesson page renders demo with localized UI', async ({ page }) => {
		const response = await page.goto('/agentviz/en/learn/r05-rag-eval/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/en/learn/r05-rag-eval/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'Evaluating RAG' })
		).toBeVisible();

		const demo = page.getByRole('region', { name: 'Swim lane timeline' });
		await expect(demo).toBeVisible();
		const progress = demo.locator('span[aria-label="Playback progress"]');
		await expect(progress).toHaveText('0/13');

		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);
		await demo.getByRole('button', { name: 'Step forward' }).click();
		await expect(progress).toHaveText('1/13');

		const sourceLinks = page.locator('footer a[href^="https://"]');
		await expect(sourceLinks.first()).toBeVisible();
		expect(await sourceLinks.count()).toBeGreaterThanOrEqual(1);
	});

	// M3 S5: A03 memory — swimlane demo, 4 lanes / 13 events.
	test('A03 lesson page renders swimlane demo and steps through playback', async ({ page }) => {
		const response = await page.goto('/agentviz/learn/a03-memory/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/learn/a03-memory/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'A03 记忆：窗口、摘要与外部存储' })
		).toBeVisible();

		const demo = page.getByRole('region', { name: '泳道时间轴' });
		await expect(demo).toBeVisible();
		const progress = demo.locator('span[aria-label="播放进度"]');
		await expect(progress).toHaveText('0/13');

		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);

		await demo.getByRole('button', { name: '单步前进' }).click();
		await expect(progress).toHaveText('1/13');

		await demo.getByRole('button', { name: '单步后退' }).click();
		await expect(progress).toHaveText('0/13');
	});

	// M3 S5: A04 multi-agent — swimlane demo, 6 lanes / 15 events.
	test('A04 lesson page renders swimlane demo and steps through playback', async ({ page }) => {
		const response = await page.goto('/agentviz/learn/a04-multi-agent/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/learn/a04-multi-agent/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'A04 多智能体：编排者与工人' })
		).toBeVisible();

		const demo = page.getByRole('region', { name: '泳道时间轴' });
		await expect(demo).toBeVisible();
		const progress = demo.locator('span[aria-label="播放进度"]');
		await expect(progress).toHaveText('0/15');

		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);

		await demo.getByRole('button', { name: '单步前进' }).click();
		await expect(progress).toHaveText('1/15');

		await demo.getByRole('button', { name: '单步后退' }).click();
		await expect(progress).toHaveText('0/15');
	});

	// M3 S5: A05 MCP — swimlane demo, 6 lanes / 13 events.
	test('A05 lesson page renders swimlane demo and steps through playback', async ({ page }) => {
		const response = await page.goto('/agentviz/learn/a05-mcp/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/learn/a05-mcp/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'A05 MCP：工具的通用插座' })
		).toBeVisible();

		const demo = page.getByRole('region', { name: '泳道时间轴' });
		await expect(demo).toBeVisible();
		const progress = demo.locator('span[aria-label="播放进度"]');
		await expect(progress).toHaveText('0/13');

		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);

		await demo.getByRole('button', { name: '单步前进' }).click();
		await expect(progress).toHaveText('1/13');

		await demo.getByRole('button', { name: '单步后退' }).click();
		await expect(progress).toHaveText('0/13');
	});

	// M3 S5: A06 human in the loop — swimlane demo, 5 lanes / 13 events.
	test('A06 lesson page renders swimlane demo and steps through playback', async ({ page }) => {
		const response = await page.goto('/agentviz/learn/a06-human-in-loop/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/learn/a06-human-in-loop/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'A06 人机协同：审批闸门' })
		).toBeVisible();

		const demo = page.getByRole('region', { name: '泳道时间轴' });
		await expect(demo).toBeVisible();
		const progress = demo.locator('span[aria-label="播放进度"]');
		await expect(progress).toHaveText('0/13');

		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);

		await demo.getByRole('button', { name: '单步前进' }).click();
		await expect(progress).toHaveText('1/13');

		await demo.getByRole('button', { name: '单步后退' }).click();
		await expect(progress).toHaveText('0/13');
	});

	// M3 S5: A07 runaway experiment — swimlane demo, 4 lanes / 16 events.
	test('A07 lesson page renders swimlane demo and steps through playback', async ({ page }) => {
		const response = await page.goto('/agentviz/learn/a07-runaway/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/learn/a07-runaway/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'A07 失控实验：没有刹车的循环' })
		).toBeVisible();

		const demo = page.getByRole('region', { name: '泳道时间轴' });
		await expect(demo).toBeVisible();
		const progress = demo.locator('span[aria-label="播放进度"]');
		await expect(progress).toHaveText('0/16');

		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);

		await demo.getByRole('button', { name: '单步前进' }).click();
		await expect(progress).toHaveText('1/16');

		await demo.getByRole('button', { name: '单步后退' }).click();
		await expect(progress).toHaveText('0/16');
	});

	// M3 S5: English A03 page — localized swimlane UI, one real step forward.
	test('English A03 lesson page renders demo with localized UI', async ({ page }) => {
		const response = await page.goto('/agentviz/en/learn/a03-memory/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/en/learn/a03-memory/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'Memory: Windows, Summaries, and External Stores' })
		).toBeVisible();

		const demo = page.getByRole('region', { name: 'Swim lane timeline' });
		await expect(demo).toBeVisible();
		const progress = demo.locator('span[aria-label="Playback progress"]');
		await expect(progress).toHaveText('0/13');

		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);
		await demo.getByRole('button', { name: 'Step forward' }).click();
		await expect(progress).toHaveText('1/13');

		const sourceLinks = page.locator('footer a[href^="https://"]');
		await expect(sourceLinks.first()).toBeVisible();
		expect(await sourceLinks.count()).toBeGreaterThanOrEqual(1);
	});

	// M3 S5: English A04 page — localized swimlane UI, one real step forward.
	test('English A04 lesson page renders demo with localized UI', async ({ page }) => {
		const response = await page.goto('/agentviz/en/learn/a04-multi-agent/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/en/learn/a04-multi-agent/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'Multi-Agent Orchestration' })
		).toBeVisible();

		const demo = page.getByRole('region', { name: 'Swim lane timeline' });
		await expect(demo).toBeVisible();
		const progress = demo.locator('span[aria-label="Playback progress"]');
		await expect(progress).toHaveText('0/15');

		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);
		await demo.getByRole('button', { name: 'Step forward' }).click();
		await expect(progress).toHaveText('1/15');

		const sourceLinks = page.locator('footer a[href^="https://"]');
		await expect(sourceLinks.first()).toBeVisible();
		expect(await sourceLinks.count()).toBeGreaterThanOrEqual(1);
	});

	// M3 S5: English A05 page — localized swimlane UI, one real step forward.
	test('English A05 lesson page renders demo with localized UI', async ({ page }) => {
		const response = await page.goto('/agentviz/en/learn/a05-mcp/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/en/learn/a05-mcp/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'MCP: a Common Socket for Tools' })
		).toBeVisible();

		const demo = page.getByRole('region', { name: 'Swim lane timeline' });
		await expect(demo).toBeVisible();
		const progress = demo.locator('span[aria-label="Playback progress"]');
		await expect(progress).toHaveText('0/13');

		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);
		await demo.getByRole('button', { name: 'Step forward' }).click();
		await expect(progress).toHaveText('1/13');

		const sourceLinks = page.locator('footer a[href^="https://"]');
		await expect(sourceLinks.first()).toBeVisible();
		expect(await sourceLinks.count()).toBeGreaterThanOrEqual(1);
	});

	// M3 S5: English A06 page — localized swimlane UI, one real step forward.
	test('English A06 lesson page renders demo with localized UI', async ({ page }) => {
		const response = await page.goto('/agentviz/en/learn/a06-human-in-loop/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/en/learn/a06-human-in-loop/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'Human in the Loop' })
		).toBeVisible();

		const demo = page.getByRole('region', { name: 'Swim lane timeline' });
		await expect(demo).toBeVisible();
		const progress = demo.locator('span[aria-label="Playback progress"]');
		await expect(progress).toHaveText('0/13');

		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);
		await demo.getByRole('button', { name: 'Step forward' }).click();
		await expect(progress).toHaveText('1/13');

		const sourceLinks = page.locator('footer a[href^="https://"]');
		await expect(sourceLinks.first()).toBeVisible();
		expect(await sourceLinks.count()).toBeGreaterThanOrEqual(1);
	});

	// M3 S5: English A07 page — localized swimlane UI, one real step forward.
	test('English A07 lesson page renders demo with localized UI', async ({ page }) => {
		const response = await page.goto('/agentviz/en/learn/a07-runaway/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/en/learn/a07-runaway/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'The Runaway Experiment: a Loop with no Brakes' })
		).toBeVisible();

		const demo = page.getByRole('region', { name: 'Swim lane timeline' });
		await expect(demo).toBeVisible();
		const progress = demo.locator('span[aria-label="Playback progress"]');
		await expect(progress).toHaveText('0/16');

		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);
		await demo.getByRole('button', { name: 'Step forward' }).click();
		await expect(progress).toHaveText('1/16');

		const sourceLinks = page.locator('footer a[href^="https://"]');
		await expect(sourceLinks.first()).toBeVisible();
		expect(await sourceLinks.count()).toBeGreaterThanOrEqual(1);
	});

	// M3 S6: G01 evaluation — swimlane demo, 5 lanes / 13 events.
	test('G01 lesson page renders swimlane demo and steps through playback', async ({ page }) => {
		const response = await page.goto('/agentviz/learn/g01-evaluation/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/learn/g01-evaluation/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'G01 评估：上线前的考卷' })
		).toBeVisible();

		const demo = page.getByRole('region', { name: '泳道时间轴' });
		await expect(demo).toBeVisible();
		const progress = demo.locator('span[aria-label="播放进度"]');
		await expect(progress).toHaveText('0/13');

		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);

		await demo.getByRole('button', { name: '单步前进' }).click();
		await expect(progress).toHaveText('1/13');

		await demo.getByRole('button', { name: '单步后退' }).click();
		await expect(progress).toHaveText('0/13');
	});

	// M3 S6: G02 cost engineering — token-type island; the before/after groups
	// carry the cache arithmetic (4000 full-price vs 688 effective billed tokens).
	test('G02 cost engineering responds to real clicks', async ({ page }) => {
		const response = await page.goto('/agentviz/learn/g02-cost-engineering/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/learn/g02-cost-engineering/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'G02 成本工程：缓存与精打细算' })
		).toBeVisible();

		const afterButton = page.getByRole('button', { name: /改造后/ });
		await afterButton.scrollIntoViewIfNeeded();
		await expect(async () => {
			await afterButton.click();
			await expect(afterButton).toHaveAttribute('aria-pressed', 'true', { timeout: 1000 });
		}).toPass();

		const panel = page.locator('[aria-label="token 解析面板"]');
		await expect(panel.getByText(/token 数 688/)).toBeVisible();

		// 100000 requests × 688 effective tokens × ¥4/M = ¥275.2000 (the daily bill).
		const requestsInput = panel.getByLabel('请求数（次）');
		await requestsInput.fill('100000');
		await expect(panel.getByText('输入成本 ≈ ¥275.2000')).toBeVisible();

		// Before the change: 100000 × 4000 × ¥4/M = ¥1600.0000.
		await page.getByRole('button', { name: /改造前/ }).click();
		await expect(panel.getByText(/token 数 4000/)).toBeVisible();
		await expect(panel.getByText('输入成本 ≈ ¥1600.0000')).toBeVisible();

		const sourceLinks = page.locator('footer a[href^="https://"]');
		expect(await sourceLinks.count()).toBeGreaterThanOrEqual(1);
	});

	// M3 S6: G03 guardrails — swimlane demo, 6 lanes / 13 events.
	test('G03 lesson page renders swimlane demo and steps through playback', async ({ page }) => {
		const response = await page.goto('/agentviz/learn/g03-guardrails/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/learn/g03-guardrails/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'G03 护栏：输入与输出的闸门' })
		).toBeVisible();

		const demo = page.getByRole('region', { name: '泳道时间轴' });
		await expect(demo).toBeVisible();
		const progress = demo.locator('span[aria-label="播放进度"]');
		await expect(progress).toHaveText('0/13');

		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);

		await demo.getByRole('button', { name: '单步前进' }).click();
		await expect(progress).toHaveText('1/13');

		await demo.getByRole('button', { name: '单步后退' }).click();
		await expect(progress).toHaveText('0/13');
	});

	// M3 S6: English G01 page — localized swimlane UI, one real step forward.
	test('English G01 lesson page renders demo with localized UI', async ({ page }) => {
		const response = await page.goto('/agentviz/en/learn/g01-evaluation/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/en/learn/g01-evaluation/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'Evaluation before Shipping' })
		).toBeVisible();

		const demo = page.getByRole('region', { name: 'Swim lane timeline' });
		await expect(demo).toBeVisible();
		const progress = demo.locator('span[aria-label="Playback progress"]');
		await expect(progress).toHaveText('0/13');

		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);
		await demo.getByRole('button', { name: 'Step forward' }).click();
		await expect(progress).toHaveText('1/13');

		const sourceLinks = page.locator('footer a[href^="https://"]');
		await expect(sourceLinks.first()).toBeVisible();
		expect(await sourceLinks.count()).toBeGreaterThanOrEqual(1);
	});

	// M3 S6: English G02 page — localized token bench, exact constructed values.
	test('English G02 lesson page renders cost bench with localized UI', async ({ page }) => {
		const response = await page.goto('/agentviz/en/learn/g02-cost-engineering/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/en/learn/g02-cost-engineering/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'Cost Engineering: Caching and Budgeting' })
		).toBeVisible();

		const bench = page.locator('[aria-label="Token anatomy bench"]');
		await expect(bench).toBeVisible();

		const afterButton = page.getByRole('button', { name: /After: 92% hit rate/ });
		await afterButton.scrollIntoViewIfNeeded();
		await expect(async () => {
			await afterButton.click();
			await expect(afterButton).toHaveAttribute('aria-pressed', 'true', { timeout: 1000 });
		}).toPass();
		await expect(page.getByText(/tokens 688/)).toBeVisible();

		// 100000 requests × 688 effective tokens × ¥4/M = ¥275.2000.
		const requestsInput = page.getByLabel('Requests');
		await requestsInput.fill('100000');
		await expect(page.getByText('Estimated input cost ≈ ¥275.2000')).toBeVisible();

		const sourceLinks = page.locator('footer a[href^="https://"]');
		expect(await sourceLinks.count()).toBeGreaterThanOrEqual(1);
	});

	// M3 S6: English G03 page — localized swimlane UI, one real step forward.
	test('English G03 lesson page renders demo with localized UI', async ({ page }) => {
		const response = await page.goto('/agentviz/en/learn/g03-guardrails/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/en/learn/g03-guardrails/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'Guardrails' })
		).toBeVisible();

		const demo = page.getByRole('region', { name: 'Swim lane timeline' });
		await expect(demo).toBeVisible();
		const progress = demo.locator('span[aria-label="Playback progress"]');
		await expect(progress).toHaveText('0/13');

		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);
		await demo.getByRole('button', { name: 'Step forward' }).click();
		await expect(progress).toHaveText('1/13');

		const sourceLinks = page.locator('footer a[href^="https://"]');
		await expect(sourceLinks.first()).toBeVisible();
		expect(await sourceLinks.count()).toBeGreaterThanOrEqual(1);
	});
});
