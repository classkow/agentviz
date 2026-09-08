import { test, expect } from '@playwright/test';
import { reviewStatus } from '../src/lib/review-status';

/**
 * Smoke gate — 72 个存量用例 + R3 新增的自测题 / 站内搜索 / 自由输入 / 可达性 /
 * 复审状态用例，共 82 个。
 *
 * Page-level guarantees:
 *   - `/agentviz/`                             中文首页：品牌、课程地图、MVP 角标计数、GitHub 链接、站内搜索入口。
 *   - `/agentviz/learn/`                       课程索引：六个模块、MVP 课、以及「🌱 最近更新」角标。
 *   - `/agentviz/learn/e01-request-journey/`   正文与来源链接、审校行与来源核验日期一致、课末自测在浏览器里判分。
 *   - `/agentviz/learn/e02-token-anatomy/`     Token 解剖台响应真实点击。
 *   - `/agentviz/learn/e03-sampling-lab/`      采样台预设、200 次实测频率覆盖层。
 *   - `/agentviz/learn/e04-context-window/`    窗口账本；`e05` 成本账单。
 *   - `/agentviz/learn/a02-agent-episode/`     Episode 回放岛注水并按真实点击步进。
 *   - `/agentviz/learn/r01-rag-pipeline/`      泳道播放链、键盘步进、正文锚点定位到第 N 步、窄屏可聚焦滚动区。
 *   - `/agentviz/en/learn/<slug>/`             每个英文课路由的对应保证（含本地化 UI 文案）。
 *   - `/agentviz/lab/`                         三个沙箱各挂载一个可用演示；token-counter 支持自由输入重算。
 *   - `/agentviz/references/`                  参考库按模块聚合全部来源。
 *   - `/agentviz/about/` 与 `/agentviz/en/about/`  关于页渲染且能从各自语言的导航抵达。
 *   - 阅读进度                                  已读切换在索引页与首页打卡延续。
 *   - 站内搜索                                  Pagefind 弹窗能用中文词（及英文词）命中对应课页。
 *
 * The Chinese homepage screenshot is captured as a permanent artifact for the
 * milestone report at `tests/screenshots/home.png`; the other pages only need a
 * passing 200 + copy check.
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
		// Site status banner.
		await expect(
			page.getByText('已上线 27 门课 · 持续更新', { exact: true })
		).toBeVisible();

		// All six module names, in both Chinese (primary heading) and English (subhead).
		const zhModules = [
			'地基：和 LLM 对话',
			'Prompt 工程',
			'Tool Calling',
			'RAG',
			'Agent',
			'上线工程化'
		];
		const enModules = [
			'LLM Foundations',
			'Prompt Engineering',
			'Tool Calling',
			'Retrieval-Augmented Generation',
			'Agents',
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
		const aCard = page.getByRole('link', { name: /Agents/ });
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
			page.getByText('27 lessons live · updated regularly.', {
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
		await expect(page.getByText('1 token sampled')).toBeVisible();
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

	// M5b S2: 泳道播放链路（play → 进度增长 → pause → reset）
	test('R01 lesson page swimlane playback chain (play/pause/reset)', async ({ page }) => {
		const response = await page.goto('/agentviz/learn/r01-rag-pipeline/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/learn/r01-rag-pipeline/ status').toBe(200);

		const demo = page.getByRole('region', { name: '泳道时间轴' });
		const progress = demo.locator('span[aria-label="播放进度"]');
		await expect(progress).toHaveText('0/17');

		// 注水门门：astro-island[ssr] 消失后 Vue 才接管按钮。
		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);

		// 播放：1200ms STEP_MS 内首跳 0/17→1/17；expect 自带轮询捕获。
		await demo.getByRole('button', { name: '播放' }).click();
		await expect(progress).not.toHaveText('0/17');

		// 暂停并重置，断言回到 0/17。
		await demo.getByRole('button', { name: '暂停' }).click();
		await demo.getByRole('button', { name: '重置' }).click();
		await expect(progress).toHaveText('0/17');
	});

	// M5b S2: 末尾点播放 → 内部 atEnd 复位 → 进度回到 0/17
	test('R01 lesson page swimlane at-end replay reset', async ({ page }) => {
		const response = await page.goto('/agentviz/learn/r01-rag-pipeline/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/learn/r01-rag-pipeline/ status').toBe(200);

		const demo = page.getByRole('region', { name: '泳道时间轴' });
		const progress = demo.locator('span[aria-label="播放进度"]');
		await expect(progress).toHaveText('0/17');

		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);

		// 17 次单步前进走到末尾（每次 stepForward 内部 pause + 推进）。
		for (let i = 0; i < 17; i++) {
			await demo.getByRole('button', { name: '单步前进' }).click();
		}
		await expect(progress).toHaveText('17/17');

		// 在 atEnd 状态点播放：play() 内部把 currentIndex 重置为 -1。
		// 校验徽标立即回到 0/17；容忍 1200ms 内可能跳到 1/17（0|1 同义）。
		await demo.getByRole('button', { name: '播放' }).click();
		await expect(progress).toHaveText(/^(0|1)\/17$/);

		// 重置收尾。
		await demo.getByRole('button', { name: '重置' }).click();
		await expect(progress).toHaveText('0/17');
	});

	// M5b S2: 点击第 5 个事件行（i5：建库 · 向量 + 原文 + 元数据入库）→ 进度跳到 5/17
	test('R01 lesson page swimlane event row click jumps progress', async ({ page }) => {
		const response = await page.goto('/agentviz/learn/r01-rag-pipeline/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/learn/r01-rag-pipeline/ status').toBe(200);

		const demo = page.getByRole('region', { name: '泳道时间轴' });
		const progress = demo.locator('span[aria-label="播放进度"]');
		await expect(progress).toHaveText('0/17');

		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);

		// 第 5 个事件（i5）的 label 取自 src/demos/r01-rag-pipeline.json。
		// 行级 @click=jumpTo(index) 在冒泡路径上，文本节点 click 同样会触发。
		await demo.getByText('建库 · 向量 + 原文 + 元数据入库', { exact: true }).click();
		await expect(progress).toHaveText('5/17');
	});

	// M5b S2: 容器 focus 后 ArrowRight / ArrowLeft 单步走（section tabindex=0）
	test('R01 lesson page swimlane keyboard navigation', async ({ page }) => {
		const response = await page.goto('/agentviz/learn/r01-rag-pipeline/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/learn/r01-rag-pipeline/ status').toBe(200);

		const demo = page.getByRole('region', { name: '泳道时间轴' });
		const progress = demo.locator('span[aria-label="播放进度"]');
		await expect(progress).toHaveText('0/17');

		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);

		// 容器 section tabindex=0；focus 后按键落到 @keydown.left/right。
		await demo.focus();
		await page.keyboard.press('ArrowRight');
		await expect(progress).toHaveText('1/17');
		await page.keyboard.press('ArrowLeft');
		await expect(progress).toHaveText('0/17');
	});

	// M5b S2: SamplingLab 温度预设 1.0 → 拖到 0.3 → 分布区刷新
	test('E03 sampling lab temperature preset and slider re-render', async ({ page }) => {
		const response = await page.goto('/agentviz/learn/e03-sampling-lab/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/learn/e03-sampling-lab/ status').toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'E03 采样实验室：temperature、top-p 与 top-k' })
		).toBeVisible();

		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);

		// 温度滑块 aria-label 为「temperature 温度」。
		const tempSlider = page.getByLabel('temperature 温度');
		await expect(tempSlider).toBeVisible();

		// 默认即 1.0；显式点 1.0 标准预设确认一遍：值=1，T=1.00 指示器出现。
		await page.getByRole('button', { name: '预设温度 1.0：标准档' }).click();
		await expect(tempSlider).toHaveValue('1');
		await expect(page.getByText('T=1.00 · top-k=12 · top-p=1.00')).toBeVisible();

		// 拖到 0.3：fill() 在 range 上同步派 input 事件，触发 Vue v-model 刷新。
		await tempSlider.fill('0.3');
		await expect(tempSlider).toHaveValue('0.3');
		await expect(page.getByText('T=0.30 · top-k=12 · top-p=1.00')).toBeVisible();
	});

	// M5b S2: en A01 ReAct loop demo 走一步
	test('English A01 lesson page steps through the ReAct loop demo', async ({ page }) => {
		const response = await page.goto('/agentviz/en/learn/a01-agent-loop/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/en/learn/a01-agent-loop/ status').toBe(200);

		const demo = page.getByRole('region', { name: 'Swim lane timeline' });
		await expect(demo).toBeVisible();
		const progress = demo.locator('span[aria-label="Playback progress"]');
		await expect(progress).toHaveText('0/8');

		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);

		await demo.getByRole('button', { name: 'Step forward' }).click();
		await expect(progress).toHaveText('1/8');
	});

	// M5b S2: en R01 RAG pipeline demo 走一步
	test('English R01 lesson page steps through its pipeline demo', async ({ page }) => {
		const response = await page.goto('/agentviz/en/learn/r01-rag-pipeline/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/en/learn/r01-rag-pipeline/ status').toBe(200);

		const demo = page.getByRole('region', { name: 'Swim lane timeline' });
		await expect(demo).toBeVisible();
		const progress = demo.locator('span[aria-label="Playback progress"]');
		await expect(progress).toHaveText('0/17');

		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);

		await demo.getByRole('button', { name: 'Step forward' }).click();
		await expect(progress).toHaveText('1/17');
	});

	// R1-1: the English homepage used to hand every card and the header Home
	// link to the Chinese routes. Both must stay under /agentviz/en/.
	test('English homepage keeps every link on the English routes', async ({ page }) => {
		await page.goto('/agentviz/en/');

		// Header Home link (desktop and mobile navs both render it).
		await expect(
			page.getByRole('link', { name: 'Home', exact: true }).first()
		).toHaveAttribute('href', '/agentviz/en/');

		// All six course-map cards point at their English launch lesson.
		const cards = page.locator('section[aria-label="Course map"] a[href*="/learn/"]');
		await expect(cards).toHaveCount(6);
		for (let i = 0; i < 6; i++) {
			await expect(cards.nth(i)).toHaveAttribute('href', /\/agentviz\/en\/learn\/[a-z0-9-]+\/$/);
		}

		// A real click lands on an English lesson.
		await page.getByRole('link', { name: /LLM Foundations/ }).click();
		await expect(page).toHaveURL(/\/agentviz\/en\/learn\/e01-request-journey\/$/);
	});

	// R1-2: same-module previous/next pager on the Chinese lesson pages.
	test('Chinese lesson pages carry a same-module pager with working links', async ({ page }) => {
		const pager = page.getByRole('navigation', { name: '课程导航' });

		await page.goto('/agentviz/learn/e01-request-journey/');
		await expect(pager).toBeVisible();
		// First lesson of module E: the previous slot is a muted label, not a link.
		await expect(pager.getByText('本模块第一课')).toBeVisible();
		await expect(pager.getByRole('link', { name: /上一课/ })).toHaveCount(0);
		await expect(pager.getByText('模块 E · 第 1/5 课')).toBeVisible();
		await pager.getByRole('link', { name: /下一课：E02/ }).click();
		await expect(page).toHaveURL(/\/agentviz\/learn\/e02-token-anatomy\/$/);

		await page.goto('/agentviz/learn/e03-sampling-lab/');
		await expect(pager.getByText('模块 E · 第 3/5 课')).toBeVisible();
		await expect(pager.getByRole('link', { name: /上一课：E02/ })).toBeVisible();
		await expect(pager.getByRole('link', { name: /下一课：E04/ })).toBeVisible();
		await pager.getByRole('link', { name: /上一课：E02/ }).click();
		await expect(page).toHaveURL(/\/agentviz\/learn\/e02-token-anatomy\/$/);

		// Last lesson of the module closes with a muted label too.
		await page.goto('/agentviz/learn/e05-cost-breakdown/');
		await expect(pager.getByText('模块 E · 第 5/5 课')).toBeVisible();
		await expect(pager.getByText('本模块最后一课')).toBeVisible();
		await expect(pager.getByRole('link', { name: /下一课/ })).toHaveCount(0);
	});

	// R1-2: the English template renders the same pager in English, and its
	// hrefs stay on the English routes.
	test('English lesson pages carry a same-module pager with working links', async ({ page }) => {
		const pager = page.getByRole('navigation', { name: 'Lesson navigation' });

		await page.goto('/agentviz/en/learn/e01-request-journey/');
		await expect(pager).toBeVisible();
		await expect(pager.getByText('First lesson in this module')).toBeVisible();
		await expect(pager.getByText('Module E · Lesson 1 of 5')).toBeVisible();
		await expect(pager.getByRole('link', { name: /Next: Token Anatomy/ })).toHaveAttribute(
			'href',
			'/agentviz/en/learn/e02-token-anatomy/'
		);

		await page.goto('/agentviz/en/learn/e03-sampling-lab/');
		await expect(pager.getByText('Module E · Lesson 3 of 5')).toBeVisible();
		await expect(pager.getByRole('link', { name: /Previous/ }).first()).toBeVisible();
		await pager.getByRole('link', { name: /Previous/ }).first().click();
		await expect(page).toHaveURL(/\/agentviz\/en\/learn\/e02-token-anatomy\/$/);
	});

	// R2-1: the lab index grew from one card to three, and each card now says
	// what can be adjusted and what to watch for. Two of the three entries are
	// opened for real, so a broken route or a missing demo payload fails here.
	test('Lab index lists three sandboxes and each one opens a working demo', async ({ page }) => {
		const response = await page.goto('/agentviz/lab/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/lab/ status').toBe(200);

		await expect(page.getByRole('heading', { level: 1, name: '实验室' })).toBeVisible();
		const cards = page.locator('section a[href*="/agentviz/lab/"]');
		await expect(cards).toHaveCount(3);
		await expect(page.getByText(/^可调：/)).toHaveCount(3);
		await expect(page.getByText(/^看什么：/)).toHaveCount(3);

		// Token counter sandbox: the island hydrates and the cost math reacts.
		await page.getByRole('link', { name: /Token 计数器全屏演示/ }).click();
		await expect(page).toHaveURL(/\/agentviz\/lab\/token-counter\/$/);
		const bench = page.locator('[aria-label="token 解析面板"]');
		await expect(bench).toBeVisible();
		const groupButton = page.getByRole('button', { name: /数字与单号/ });
		await groupButton.scrollIntoViewIfNeeded();
		await expect(async () => {
			await groupButton.click();
			await expect(groupButton).toHaveAttribute('aria-pressed', 'true', { timeout: 1000 });
		}).toPass();
		await expect(bench.getByText(/token 数 16/)).toBeVisible();
		await bench.getByLabel('请求数（次）').fill('5000');
		await expect(bench.getByText('输入成本 ≈ ¥0.3200')).toBeVisible();

		// Sampling sandbox: sampling twice really appends two tokens.
		await page.goto('/agentviz/lab/sampling-lab/');
		const lab = page.getByRole('region', { name: '采样实验室' });
		await expect(lab).toBeVisible();
		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);
		const sampleButton = page.getByRole('button', { name: '按当前分布采样一次' });
		await sampleButton.click();
		await sampleButton.click();
		await expect(page.getByText('已采样 2 个 token')).toBeVisible();
	});

	// R2-2: the five priority lessons gained copyable blocks. Assert the fence
	// count per lesson and that each block carries its demo's own figures, which
	// is what keeps the code aligned with the animation above it.
	test('Priority lessons carry copyable code blocks aligned with their demos', async ({ page }) => {
		await page.goto('/agentviz/learn/t01-function-calling/');
		const t01Blocks = page.locator('.lesson-body pre[data-language="json"]');
		await expect(t01Blocks).toHaveCount(3);
		await expect(t01Blocks.nth(0)).toContainText('"name": "get_order_total"');
		await expect(t01Blocks.nth(0)).toContainText('"input_schema"');
		await expect(t01Blocks.nth(1)).toContainText('"id": "toolu_01A"');
		await expect(t01Blocks.nth(2)).toContainText('"tool_use_id": "toolu_01A"');
		await expect(t01Blocks.nth(2)).toContainText('¥4,182,000');

		await page.goto('/agentviz/learn/e01-request-journey/');
		const e01Block = page.locator('.lesson-body pre[data-language="json"]');
		await expect(e01Block).toHaveCount(1);
		await expect(e01Block).toContainText('"model": "deepseek-v4-flash"');
		await expect(e01Block).toContainText('"stream": true');
		await expect(e01Block).toContainText('"max_tokens": 1024');

		await page.goto('/agentviz/learn/r01-rag-pipeline/');
		const r01Block = page.locator('.lesson-body pre[data-language="json"]');
		await expect(r01Block).toHaveCount(1);
		await expect(r01Block).toContainText('"top_k": 5');
		await expect(r01Block).toContainText('[0.91, 0.88, 0.85, 0.71, 0.42]');

		await page.goto('/agentviz/learn/g02-cost-engineering/');
		const g02Block = page.locator('.lesson-body pre[data-language="json"]');
		await expect(g02Block).toHaveCount(1);
		await expect(g02Block).toContainText('"billed_tokens": 688');
		await expect(g02Block).toContainText('"cost_per_month_cny_30d": 48000');

		await page.goto('/agentviz/learn/p01-structured-prompts/');
		const p01Block = page.locator('.lesson-body pre[data-language="text"]');
		await expect(p01Block).toHaveCount(1);
		await expect(p01Block).toContainText('[角色]');
		await expect(p01Block).toContainText('sender、deadline、priority、reply_by');

		// The English pair carries the same blocks with the same figures.
		await page.goto('/agentviz/en/learn/p01-structured-prompts/');
		await expect(page.locator('.lesson-body pre[data-language="text"]')).toContainText('[ROLE]');
	});

	// R2-10: the references page is a real aggregate, not a stub paragraph.
	test('References page aggregates every lesson source by module', async ({ page }) => {
		const response = await page.goto('/agentviz/references/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/references/ status').toBe(200);

		await expect(page.getByRole('heading', { level: 1, name: '参考库' })).toBeVisible();
		await expect(
			page.locator('p', { hasText: '全站 27 门课引用的 46 条来源（引用关系共 58 次）' })
		).toHaveCount(1);

		// Six module groups, 46 deduplicated entries, each with a verification date.
		await expect(page.getByRole('heading', { level: 2 })).toHaveCount(6);
		const entries = page.locator('section li');
		await expect(entries).toHaveCount(46);
		await expect(page.locator('li p', { hasText: /核验于 \d{4}-\d{2}-\d{2}/ })).toHaveCount(46);

		// Readable host names replace raw domains as the link label.
		await expect(page.getByText('Anthropic Docs', { exact: true }).first()).toBeVisible();

		// A source shared by two modules lists both citing lessons once each,
		// with the English twin as a separate link.
		const shared = page.locator('li', { hasText: 'build-with-claude/prompt-caching' });
		await expect(shared).toHaveCount(1);
		await expect(shared.locator('a[hreflang="en"]')).toHaveCount(2);

		// A real click lands on the lesson that cites the source.
		await page
			.locator('section li a[href="/agentviz/learn/t01-function-calling/"]')
			.first()
			.click();
		await expect(page).toHaveURL(/\/agentviz\/learn\/t01-function-calling\/$/);
	});

	// R2-7: English About is a real page, reachable from the English nav.
	test('English About page renders and links from the English nav', async ({ page }) => {
		const response = await page.goto('/agentviz/en/about/');
		expect(response, 'navigation response').not.toBeNull();
		expect(response!.status(), 'GET /agentviz/en/about/ status').toBe(200);

		await expect(page.getByRole('heading', { level: 1, name: 'About' })).toBeVisible();
		await expect(page.getByRole('heading', { level: 2, name: "Who it's for" })).toBeVisible();
		await expect(page.locator('html')).toHaveAttribute('lang', 'en');

		// The Chinese-only caveat appears both in the page and in the footer.
		await expect(
			page.locator('p', { hasText: 'currently published in Chinese only' })
		).toBeVisible();
		const footerNote = page.locator('footer', { hasText: 'still Chinese-only' });
		await expect(footerNote).toBeVisible();
		await expect(footerNote.getByRole('link', { name: '实验室 (Lab)' })).toHaveAttribute(
			'href',
			'/agentviz/lab/'
		);

		// Nav entry on the English homepage leads here for real.
		await page.goto('/agentviz/en/');
		await page.getByRole('link', { name: 'About', exact: true }).first().click();
		await expect(page).toHaveURL(/\/agentviz\/en\/about\/$/);
	});

	// R2-5: the read-progress toggle is the only writer; the index badge and the
	// homepage module counter are readers of the same localStorage key.
	test('Read-progress toggle carries over to the index and the homepage', async ({ page }) => {
		await page.goto('/agentviz/learn/t01-function-calling/');
		// The button's accessible name flips with its state, so locate it by the
		// slug attribute and assert on the label text itself.
		const toggle = page.locator('button[data-read-toggle="t01-function-calling"]');
		await expect(toggle).toBeVisible();
		await expect(toggle).toHaveText('标记为已读');
		await expect(toggle).toHaveAttribute('aria-pressed', 'false');
		await toggle.click();
		await expect(toggle).toHaveAttribute('aria-pressed', 'true');
		await expect(toggle).toHaveText('✓ 已读（点击取消）');

		// Course index: this lesson's badge un-hides, the others stay hidden.
		await page.goto('/agentviz/learn/');
		await expect(page.locator('[data-read-badge="t01-function-calling"]')).toBeVisible();
		await expect(page.locator('[data-read-badge="e01-request-journey"]')).toBeHidden();

		// Homepage: module T's counter reports 1 of its 3 lessons read.
		await page.goto('/agentviz/');
		const counter = page.locator('[data-read-module="T"]');
		await expect(counter).toBeVisible();
		await expect(counter).toHaveText('1/3 已读');
		await expect(page.locator('[data-read-module="E"]')).toBeHidden();

		// Undo through the same button, and the storage entry disappears.
		await page.goto('/agentviz/learn/t01-function-calling/');
		await expect(toggle).toHaveText('✓ 已读（点击取消）');
		await toggle.click();
		await expect(toggle).toHaveAttribute('aria-pressed', 'false');
		await expect(toggle).toHaveText('标记为已读');
		const stored = await page.evaluate(() => localStorage.getItem('agentviz-read-lessons'));
		expect(JSON.parse(stored ?? '[]')).not.toContain('t01-function-calling');
	});

	// R2-3: a `#demo-step-N` hash drives the swimlane — as a deep link on load
	// and as an in-page hash change — with out-of-range values clamped.
	test('Demo step anchors seek the swimlane to the named step', async ({ page }) => {
		// The primary path: a real click on the in-body anchor link.
		await page.goto('/agentviz/learn/t01-function-calling/');
		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);
		const t01Demo = page.getByRole('region', { name: '泳道时间轴' });
		const t01Progress = t01Demo.locator('span[aria-label="播放进度"]');
		await expect(t01Progress).toHaveText('0/11');
		await page.locator('.lesson-body a[href="#demo-step-4"]').click();
		await expect(t01Progress).toHaveText('4/11');

		// The same anchor as a deep link, resolved before the island hydrates.
		await page.goto('/agentviz/learn/r01-rag-pipeline/#demo-step-5');
		const demo = page.getByRole('region', { name: '泳道时间轴' });
		const progress = demo.locator('span[aria-label="播放进度"]');
		await expect(progress).toHaveText('5/17');

		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);
		await page.evaluate(() => {
			window.location.hash = '#demo-step-11';
		});
		await expect(progress).toHaveText('11/17');

		// Beyond the last event: clamp to the end rather than ignore the jump.
		await page.evaluate(() => {
			window.location.hash = '#demo-step-999';
		});
		await expect(progress).toHaveText('17/17');

		// An unrelated hash leaves playback untouched.
		await page.evaluate(() => {
			window.location.hash = '#something-else';
		});
		await expect(progress).toHaveText('17/17');

		// The English lesson pages carry the same anchors, on the English routes.
		await page.goto('/agentviz/en/learn/p01-structured-prompts/#demo-step-7');
		await expect(
			page.getByRole('region', { name: 'Swim lane timeline' }).locator('span[aria-label="Playback progress"]')
		).toHaveText('7/12');
	});

	// R2-8: the 200-draw overlay puts a measured frequency beside every
	// theoretical probability and reports the top-1 hit rate — and a parameter
	// change throws the stale batch away.
	test('Sampling lab overlays measured frequencies from 200 draws', async ({ page }) => {
		await page.goto('/agentviz/learn/e03-sampling-lab/');
		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);

		await page.getByRole('button', { name: '按当前分布连抽 200 次，统计每个候选的实测频率' }).click();

		// All 12 candidates are kept at the default parameters, so all 12 gain a
		// measured column next to the theoretical one.
		await expect(page.getByText(/^实测 \d+\.\d%$/)).toHaveCount(12);
		const summary = page.locator('p', { hasText: /top-1 候选「.+」命中 \d+ 次/ });
		await expect(summary).toHaveCount(1);
		await expect(summary).toBeVisible();
		await expect(page.locator('p', { hasText: '大数下实测频率趋近理论概率' })).toBeVisible();

		// The measured shares must add up to the 200 draws.
		const measured = await page
			.getByText(/^实测 \d+\.\d%$/)
			.allTextContents();
		const total = measured.reduce((sum, text) => sum + Number(/([\d.]+)%/.exec(text)![1]), 0);
		expect(Math.round(total)).toBe(100);

		// Change a parameter and the batch is discarded — it no longer describes
		// the distribution on screen.
		await page.getByLabel('temperature 温度').fill('0.5');
		await expect(page.getByText(/^实测 \d+\.\d%$/)).toHaveCount(0);
		await expect(summary).toHaveCount(0);

		// The English dictionary wires the same feature up.
		await page.goto('/agentviz/en/learn/e03-sampling-lab/');
		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);
		await page
			.getByRole('button', { name: 'Draw 200 times from the current distribution and tally each candidate' })
			.click();
		await expect(page.getByText(/^measured \d+\.\d%$/)).toHaveCount(12);
		await expect(page.locator('p', { hasText: /top-1 candidate ".+" hit \d+ times/ })).toHaveCount(1);
		await expect(
			page.locator('p', { hasText: 'Given enough draws, the measured frequency converges' })
		).toBeVisible();
	});

	// R3-1: the quiz is judged in the browser — a wrong pick reveals the
	// correct option and its one-line explanation, and can be redone.
	test('E01 lesson quiz grades real clicks and reveals the answer', async ({ page }) => {
		await page.goto('/agentviz/learn/e01-request-journey/');
		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);

		const quiz = page.getByRole('region', { name: '课末自测' });
		await expect(quiz).toBeVisible();
		await expect(quiz.locator('[data-quiz-question]')).toHaveCount(3);
		await expect(quiz.locator('[data-quiz-question="0"] [data-quiz-option]')).toHaveCount(4);

		// Nothing to judge until an option is picked.
		const q0 = quiz.locator('[data-quiz-question="0"]');
		await expect(q0.locator('.quiz-check')).toBeDisabled();

		// Deliberately wrong (the correct option of Q1 is index 1).
		await q0.locator('[data-quiz-option="0"] input').check();
		await expect(q0.locator('.quiz-check')).toBeEnabled();
		await q0.locator('.quiz-check').click();
		await expect(q0.getByText('✗ 答错了')).toBeVisible();
		await expect(q0.locator('.quiz-explanation')).toBeVisible();
		await expect(q0.locator('[data-quiz-option="1"]')).toContainText('正确答案');
		// Once judged the options lock; a redo has to come first.
		await expect(q0.locator('[data-quiz-option="2"] input')).toBeDisabled();

		// The same button now acts as 重做 and clears the question.
		await q0.locator('.quiz-check').click();
		await expect(q0.locator('.quiz-explanation')).toHaveCount(0);
		await expect(q0.locator('[data-quiz-option="0"] input')).not.toBeChecked();

		// Right answer this time.
		await q0.locator('[data-quiz-option="1"] input').check();
		await q0.locator('.quiz-check').click();
		await expect(q0.getByText('✓ 答对了')).toBeVisible();

		// The score line only appears once every question is judged.
		await expect(quiz.locator('.quiz-score')).toHaveCount(0);
		await quiz.locator('[data-quiz-question="1"] [data-quiz-option="3"] input').check();
		await quiz.locator('[data-quiz-question="1"] .quiz-check').click();
		await quiz.locator('[data-quiz-question="2"] [data-quiz-option="2"] input').check();
		await quiz.locator('[data-quiz-question="2"] .quiz-check').click();
		await expect(quiz.locator('.quiz-score')).toHaveText('自测得分 3/3');
	});

	// R3-1: the English twin carries English copy and the same answer key.
	test('English lesson quiz grades with localized copy', async ({ page }) => {
		await page.goto('/agentviz/en/learn/e01-request-journey/');
		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);

		const quiz = page.getByRole('region', { name: 'Lesson quiz' });
		await expect(quiz).toBeVisible();
		const q0 = quiz.locator('[data-quiz-question="0"]');
		await q0.locator('[data-quiz-option="1"] input').check();
		await expect(q0.locator('.quiz-check')).toHaveText('Check answer');
		await q0.locator('.quiz-check').click();
		await expect(q0.getByText('✓ Correct')).toBeVisible();
		await expect(q0.locator('.quiz-check')).toHaveText('Try again');
		await expect(q0.locator('.quiz-explanation')).toContainText('See the');
	});

	// R3-1: every explanation has to point at a section that is really on the
	// page — otherwise the quiz teaches from a heading that no longer exists.
	test('T01 lesson quiz explanations cite sections that exist on the page', async ({ page }) => {
		await page.goto('/agentviz/learn/t01-function-calling/');
		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);

		const quiz = page.getByRole('region', { name: '课末自测' });
		await expect(quiz).toBeVisible();
		const answers = [1, 0, 2];
		for (const [i, answer] of answers.entries()) {
			const q = quiz.locator(`[data-quiz-question="${i}"]`);
			await q.locator(`[data-quiz-option="${answer}"] input`).check();
			await q.locator('.quiz-check').click();
			await expect(q.getByText('✓ 答对了')).toBeVisible();

			const explanation = (await q.locator('.quiz-explanation').innerText()).trim();
			const cited = /见「(.+?)」一节/.exec(explanation);
			expect(cited, `第 ${i + 1} 题的解析应点名一个小节：${explanation}`).not.toBeNull();
			await expect(
				page.locator('.lesson-body h2', { hasText: cited![1] }).first()
			).toBeVisible();
		}
		await expect(quiz.locator('.quiz-score')).toHaveText('自测得分 3/3');
	});

	// R3-3: Pagefind indexes the built site; the header opens it in a modal and
	// a Chinese content word has to find the lesson that teaches it.
	test('Site search finds the sampling lesson from the homepage', async ({ page }) => {
		await page.goto('/agentviz/');
		await page.getByRole('button', { name: '站内搜索' }).click();

		const dialog = page.getByRole('dialog', { name: '站内搜索' });
		await expect(dialog).toBeVisible();
		const input = dialog.locator('.pagefind-ui__search-input');
		await expect(input).toBeVisible();

		await input.fill('采样');
		const hit = dialog.getByRole('link', { name: /采样实验室/ }).first();
		await expect(hit).toBeVisible();
		await expect(hit).toHaveAttribute('href', /\/agentviz\/learn\/e03-sampling-lab\//);
		await hit.click();
		await expect(page).toHaveURL(/\/agentviz\/learn\/e03-sampling-lab\//);
	});

	// R4 白名单授权的防回归用例：zh 自造词（护栏）此前在 UI 整词查不到——
	// 浏览器端 zh 索引无分词 wasm（机理见 AGENTS §5-8），由 keywords frontmatter
	// + data-pagefind-meta 注入修复。本用例转红时先查 keywords 注入是否被移除。
	test('Site search finds the guardrails lesson by its coined term', async ({ page }) => {
		await page.goto('/agentviz/');
		await page.getByRole('button', { name: '站内搜索' }).click();
		const dialog = page.getByRole('dialog', { name: '站内搜索' });
		const input = dialog.locator('.pagefind-ui__search-input');
		await expect(input).toBeVisible();
		await input.fill('护栏');
		const hit = dialog.getByRole('link', { name: /护栏：输入与输出的闸门/ }).first();
		await expect(hit).toBeVisible();
		await expect(hit).toHaveAttribute('href', /\/agentviz\/learn\/g03-guardrails\//);
	});

	// R3-3: the English index is a separate Pagefind language.
	test('English site search finds the reranking lesson', async ({ page }) => {
		await page.goto('/agentviz/en/');
		await page.getByRole('button', { name: 'Search the whole site' }).click();
		const dialog = page.getByRole('dialog', { name: 'Site search' });
		const input = dialog.locator('.pagefind-ui__search-input');
		await expect(input).toBeVisible();
		await input.fill('reranking');
		await expect(
			dialog.getByRole('link', { name: /Reranking/i }).first()
		).toHaveAttribute('href', /\/agentviz\/en\/learn\/r04-reranking\//);
	});

	// R3-4: the free-input box runs the same illustrative split as the examples,
	// and an empty box falls back to the demo text.
	test('Token counter re-splits text typed into the free-input box', async ({ page }) => {
		await page.goto('/agentviz/lab/token-counter/');
		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);

		const stats = page.locator('[data-token-stats]');
		const demoStats = (await stats.textContent())!.trim();
		await expect(stats).toContainText('字符数 18');
		await expect(stats).toContainText('token 数 11');

		await page.getByLabel('自定义文本').fill('中文句子 with English words and 12345678 numbers');
		await page.getByRole('button', { name: '重算' }).click();
		// 4 汉字 → 3 枚、4 个空白词各一枚、8 位数字 → 2 枚，共 10 枚。
		await expect(stats).toContainText('字符数 44');
		await expect(stats).toContainText('token 数 10');
		await expect(stats).not.toHaveText(demoStats);

		// Empty input hands the panel back to the example group.
		await page.getByLabel('自定义文本').fill('');
		await page.getByRole('button', { name: '重算' }).click();
		await expect(stats).toHaveText(demoStats);
	});

	// R3-6: on a narrow viewport the lanes overflow, so the stage becomes a
	// focusable scroll region that arrow keys can drive.
	test('Swim lane stage is a keyboard-scrollable region on narrow screens', async ({ page }) => {
		await page.setViewportSize({ width: 380, height: 900 });
		await page.goto('/agentviz/learn/r01-rag-pipeline/');
		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr]'),
			undefined,
			{ timeout: 10_000 }
		);

		const scroller = page.getByRole('region', { name: '泳道图横向滚动区' });
		await expect(scroller).toBeVisible();
		await expect(page.getByText('← 左右滑动查看完整图')).toBeVisible();
		expect(await scroller.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeGreaterThan(0);

		await scroller.focus();
		await expect(scroller).toBeFocused();
		await scroller.press('ArrowRight');
		await expect
			.poll(async () => scroller.evaluate((el) => el.scrollLeft), { message: '方向键应能横向滚动画布' })
			.toBeGreaterThan(0);
	});

	// R3-7: the two thresholds are pure functions of reviewed_at; fixed clocks
	// keep the boundary assertions from drifting with the calendar.
	test('Review-status thresholds flip on the 21-day and 90-day boundaries', () => {
		const reviewed = new Date('2026-01-01T00:00:00Z');
		const at = (days: number) => new Date(reviewed.getTime() + days * 86_400_000);

		expect(reviewStatus(reviewed, at(21)).recent).toBe(true);
		expect(reviewStatus(reviewed, at(22)).recent).toBe(false);
		expect(reviewStatus(reviewed, at(90)).stale).toBe(false);
		expect(reviewStatus(reviewed, at(91)).stale).toBe(true);
		expect(reviewStatus(reviewed, at(91)).recent).toBe(false);
	});

	// R3-7: the footer verification date is the lesson's own reviewed_at, so the
	// two lines can never disagree — and neither depends on today's date.
	test('Lesson page review line and source-verification line agree', async ({ page }) => {
		await page.goto('/agentviz/learn/e01-request-journey/');
		const meta = (await page.locator('header p').last().textContent())!;
		const reviewed = /最后审校：(\d{4}-\d{2}-\d{2})/.exec(meta);
		expect(reviewed, '审校行应带日期').not.toBeNull();
		await expect(page.locator('footer h2')).toContainText(`来源核验于 ${reviewed![1]}`);

		await page.goto('/agentviz/en/learn/e01-request-journey/');
		const enMeta = (await page.locator('header p').last().textContent())!;
		const enReviewed = /Last reviewed: (\d{4}-\d{2}-\d{2})/.exec(enMeta);
		expect(enReviewed, 'the review line should carry a date').not.toBeNull();
		await expect(page.locator('footer h2')).toContainText(`Verified on ${enReviewed![1]}`);
	});

	// R3-7: lessons reviewed inside the window carry the badge on the index.
	test('Course index badges recently reviewed lessons', async ({ page }) => {
		const zhBadges = await page.goto('/agentviz/learn/').then(() =>
			page.locator('[data-recent-badge]').count()
		);
		expect(zhBadges).toBeGreaterThan(0);
		await expect(page.locator('[data-recent-badge]').first()).toContainText('🌱 最近更新');

		await page.goto('/agentviz/en/learn/');
		await expect(page.locator('[data-recent-badge]').first()).toContainText('🌱 Recently updated');
	});

	// R4-M: after fonts are self-hosted (no more fonts.googleapis.com /
	// fonts.gstatic.com), every request the browser actually fires from
	// either the Chinese homepage or a representative lesson page must land
	// on the preview server's loopback. Each request's host is recorded and
	// filtered against the allowed set; any leak fails the spec.
	test('No third-party network requests on homepage and a lesson page', async ({
		page,
		baseURL
	}) => {
		const allowedHosts = new Set<string>(['localhost', '127.0.0.1', '[::1]']);
		// `baseURL` from the Playwright config (`http://localhost:4321`) is the
		// canonical origin; pull its host so a future config tweak to a
		// different loopback name keeps the test green without an edit.
		if (baseURL) {
			allowedHosts.add(new URL(baseURL).hostname);
		}

		const seen: { url: string; host: string }[] = [];
		page.on('request', (request) => {
			const url = request.url();
			if (url.startsWith('data:') || url.startsWith('blob:')) return;
			let host: string;
			try {
				host = new URL(url).hostname;
			} catch {
				// Relative URLs are resolved against the document base; on the
				// preview server they always come back under the same origin.
				return;
			}
			seen.push({ url, host });
		});

		const targets = ['/agentviz/', '/agentviz/learn/e01-request-journey/'];
		for (const target of targets) {
			await page.goto(target);
			// `networkidle` waits for the page to settle: the e01 lesson page
			// has a Vue island whose hydration pulls in the woff2 files, so
			// the test must observe that fetch and then assert it stayed on
			// loopback instead of bouncing to fonts.gstatic.com.
			await page.waitForLoadState('networkidle', { timeout: 15_000 });
		}

		const offenders = seen.filter((entry) => !allowedHosts.has(entry.host));
		expect(
			offenders,
			`External network requests detected: ${JSON.stringify(offenders, null, 2)}`
		).toEqual([]);
	});
});
