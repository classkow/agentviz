# AGENTS.md

> Instructions for AI coding agents working in the AgentViz repository.
> This file is the project-level equivalent of a README for automated contributors:
> it documents the build, the conventions, and the landmines encountered in this codebase.

## 1. Project overview

AgentViz is a static-first course site that turns AI-application internals —
LLM API calls, agent loops, and RAG data flows — into interactive, explorable
animations. It is built with Astro and TypeScript (strict), styled with Tailwind
CSS v4, and uses Vue 3 islands only where a lesson needs to be manipulated
rather than merely read.

- **Live site**: <https://classkow.github.io/agentviz/>
- **Repository root**: this directory
- **Deployment target**: GitHub Pages under the `/agentviz` sub-path

## 2. Setup commands

Requirements: Node.js `>=22.12.0` (enforced by the `engines` field in
`package.json`) and pnpm.

```sh
# 1. Install dependencies.
pnpm install

# 2. One-time, only if e2e tests will be run locally: download the Chromium
#    binary used by Playwright.
pnpm exec playwright install chromium

# 3. Day-to-day commands.
pnpm dev          # Astro dev server with hot reload (serves at /agentviz)
pnpm build        # Static build into ./dist/
pnpm preview      # Serve the production build locally
pnpm run check    # astro check — type and diagnostics gate
pnpm run test:e2e # Playwright smoke gate (see §7)
```

Notes:

- The dev server opens at `/agentviz`, not `/`. The `base` field in
  `astro.config.mjs` is what causes this; the root URL only prints a pointer
  to the real entry point.
- `pnpm run test:e2e` must be run **after** `pnpm build` — Playwright boots
  `astro preview` as a `webServer` and waits for `/agentviz/` to respond. It
  will not work against the dev server.

## 3. Project structure

```
.
├── .github/workflows/    CI and GitHub Pages deployment
├── public/               Static assets copied to the site root as-is
├── src/
│   ├── pages/            One file per route (Astro pages)
│   │   ├── index.astro       Site root (zh-CN default locale)
│   │   ├── en/               English locale (prefixDefaultLocale: false)
│   │   │   ├── index.astro       English homepage
│   │   │   └── learn/        English course index and dynamic lesson route
│   │   │       ├── index.astro
│   │   │       └── [...slug].astro   Renders any entry from src/content/lessons-en/
│   │   ├── learn/            Course index and dynamic lesson route
│   │   │   ├── index.astro
│   │   │   └── [...slug].astro   Renders any entry from src/content/lessons/
│   │   └── lab/              Sandboxes that mount a single demo component
│   │       ├── index.astro           Sandbox list
│   │       ├── sampling-lab.astro
│   │       ├── timeline-demo.astro
│   │       └── token-counter.astro
│   ├── components/       Interactive islands (Vue 3) and shared Astro parts
│   │   ├── CourseMap.vue         Homepage course grid (single source of truth
│   │                            for module metadata; see §6)
│   │   ├── SwimlaneTimeline.vue  Generic timeline demo
│   │   ├── SamplingLab.vue       Sampling-parameter sandbox
│   │   ├── TokenCounter.vue        Token statistics demo (anatomy, window
│   │   │                          ledgers, cost bills, free-input re-split)
│   │   ├── QuizBlock.vue           End-of-lesson quiz (grades in the browser)
│   │   ├── SiteHeader.astro        Nav + language toggle + Pagefind search entry
│   │   │                          (`locale?: 'zh' | 'en'` picks the dictionary)
│   │   └── SiteFooter.astro      (`locale?: 'zh' | 'en'` picks the copy)
│   ├── layouts/          Base.astro (shared shell; `locale` picks <html lang>
│   │                            and the header copy; <main> carries `data-pagefind-body`)
│   ├── lib/              Build-time helpers shared by both locales
│   │   ├── read-progress.ts      localStorage 已读打卡 (client script)
│   │   ├── source-names.ts       来源域名 → 可读文档站名
│   │   ├── review-status.ts      reviewed_at → 建议复审 / 最近更新
│   │   └── lesson-body.ts        课页正文后处理：补 base 前缀 + 切自测题插入点
│   ├── content/          Content collections
│   │   ├── content.config.ts     Zod schemas for the lessons + lessonsEn collections
│   │   ├── lessons/              Chinese Markdown lessons, one file per entry (27)
│   │   ├── lessons-en/           English lessons, slugs paired with lessons/ (27)
│   │   └── quizzes/              课末自测 JSON, one file per quizzed lesson
│   │       └── en/               English quiz twins, same slugs
│   ├── demos/            JSON payloads consumed by demo components (one per
│   │   │                 lesson, plus timeline-sample.json for the lab)
│   │   └── en/               English demos, one per lesson (e03 reuses the
│   │                         root JSON)
│   └── styles/           global.css — Tailwind v4 entry point and @theme tokens
├── examples/             Runnable .mjs companions to the five lessons that carry
│   │                     code blocks (env-var driven; see examples/README.md)
├── tests/                Playwright specs and screenshot fixtures
├── astro.config.mjs      Integrations (`base`, Pagefind post-build index) + `site`
├── playwright.config.ts  Playwright config (see §7)
├── pnpm-workspace.yaml   pnpm 11 workspace and build-script allowlist
├── tsconfig.json         TypeScript project setup (strict)
└── package.json          Scripts and dependency manifest
```

## 4. Code style

- **TypeScript — strict.** `pnpm run check` must report `0 errors, 0 warnings,
  0 hints` (the last category counts). New code that introduces a hint is a
  defect; fix the type, do not silence it.
- **Tailwind v4 — literal full class names.** The v4 scanner does not see
  classes produced by string concatenation or template interpolation, so any
  utility class that is only ever assembled at runtime will be purged from
  the bundle. Keep the full class string in source as a literal; if a class
  set is large, store it as a `const` string and reference it directly. This
  applies in particular to dynamic per-module colors and hover states (see
  the `CourseMap.vue` `badgeClass` / `hoverBorderClass` / `tagClass` fields).
- **Dark theme tokens.** The site is dark-only. The body uses `bg-zinc-950`
  on `text-zinc-100` with `font-sans`; cards sit on `bg-zinc-900` with
  `border-zinc-800`. Module accent colors (one per course module) are
  fixed in `CourseMap.vue` — do not introduce new accent colors without
  updating that table. The current mapping is:

  | Module | Accent   | Subject                  |
  | :----- | :------- | :----------------------- |
  | E      | `sky-400`    | Foundations / LLM basics     |
  | P      | `cyan-400`   | Prompt engineering           |
  | T      | `emerald-400`| Tool calling                 |
  | R      | `violet-400` | RAG                          |
  | A      | `amber-400`  | Agents                 |
  | G      | `rose-400`   | Production engineering       |

  The font stack is declared in `src/styles/global.css` via `@theme`
  (`--font-sans`, `--font-mono`); add new typographic tokens there, not in
  component-level styles.

## 5. Known pitfalls

These are the seven recurring traps in this repo. Read them before touching
related code.

1. **`base: '/agentviz'` — every internal link needs the prefix.** The site is
   served at `https://classkow.github.io/agentviz/`; Astro exposes that prefix
   as `import.meta.env.BASE_URL`, which has **no trailing slash** (see
   `astro.config.mjs` and the way `Base.astro` / `CourseMap.vue` strip and
   re-add the slash). Build internal links as `` `${base}/learn/...` `` with
   an explicit `/`, never as `` `${base}learn/...` ``. Image and asset URLs
   that go through Astro's asset pipeline are handled automatically; this
   rule applies to hand-written `href`s.

2. **Astro `client:*` directives only resolve statically imported bindings.**
   In Astro 7.3, `client:load` / `client:visible` / `client:idle` etc. in a
   template must reference a component identifier that is imported with a
   plain ES `import` at the top of the file. Going through a registry map,
   a re-export alias, or `import.meta.glob` for components produces
   `NoMatchingImport` and a build-time hard fail. Concretely:
   - Keep `SwimlaneTimeline.vue`, `SamplingLab.vue`, `TokenCounter.vue` and
     `QuizBlock.vue` as static imports in
     `src/pages/learn/[...slug].astro` and select between them via a small
     `if`/`switch` on the lesson frontmatter `component` key.
   - Use `import.meta.glob` only for **data** — currently
     `src/demos/*.json` and `src/content/quizzes/*.json`.

3. **`import.meta.glob` paths are layer-sensitive and empties are silent.**
   `import.meta.glob` resolves relative to the file it is written in, so
   a glob written from `src/pages/learn/[...slug].astro` must reach up two
   levels to find `src/demos/`: `../../demos/*.json`. Write the path wrong
   and the build still succeeds — the matched set is just empty, and the
   lesson page silently renders without its demo. The English lesson page
   sits one level deeper in `src/pages/en/learn/`, so its glob reaches three
   levels: `../../../demos/en/*.json`. After any change to a glob, confirm
   the keys it returns match what the consumer expects.

4. **Playwright `baseURL` is the bare origin — keep the path out of it.**
   Playwright resolves relative `page.goto('/...')` calls with
   `new URL(path, baseURL)`, which replaces any path component of
   `baseURL` with the absolute path of the goto target. Because of that,
   `playwright.config.ts` sets `baseURL: 'http://localhost:4321'` and
   every test writes the full site path explicitly (`/agentviz/`,
   `/agentviz/learn/`, …). Do not paste `/agentviz` into `baseURL` —
   every relative navigation will jump to the wrong place. The
   `webServer.url` is set to `http://localhost:4321/agentviz/` because
   that is the concrete URL that must respond before tests start.
   If port 4321 is already in use, stop the conflicting process first:
   `pnpm exec astro dev stop` or `pnpm exec astro preview stop`.

5. **pnpm 11 build-script approval lives in `pnpm-workspace.yaml`.**
   pnpm 11 will refuse to run a package's install/build script unless the
   package is allow-listed under `allowBuilds` in `pnpm-workspace.yaml`
   (currently `esbuild: true`). When a new dependency needs to execute a
   build step, add it to that allow-list with a one-line justification in
   this section rather than disabling the safety net globally.

6. **A token-type lesson needs `component: "token"` in its frontmatter.**
   The demo registry in `[...slug].astro` defaults to `swimlane` whenever the
   `component` key is absent. Omitting the key on a TokenCounter lesson does
   not fail the build — the page silently renders the wrong island (a
   swimlane fed token-shaped JSON), and only the e2e click tests catch it.
   After adding a lesson, verify the built HTML's `astro-island
   component-url` matches the intended component (see §6, `component`).

7. **Astro collapses whitespace around inline expressions.** A template line
   like `Some text <a href={href}>link</a> more text` does **not** render the
   spaces next to the tags — the compiler folds the newline-and-indent text
   nodes away, and English copy ends up reading `textlinkmore text`. Write the
   space explicitly as `{' '}` on both sides (or keep the whole phrase inside
   one element). Chinese copy hides the bug because CJK text does not use word
   spaces, so an English-only page is where it shows up. The same rule applies
   to a `{cond && <span>…</span>}` sitting between two text runs.

## 6. Content rules

- Lessons live in `src/content/lessons/` as Markdown files, one per entry.
  They are loaded by `src/content.config.ts` using a `glob` loader; the file
  name (without `.md`) is the lesson slug, surfaced in the URL as
  `/agentviz/learn/<slug>/`.
- The Zod schema in `content.config.ts` enforces the following frontmatter
  fields, and `astro build` fails if any are missing or malformed:

  | Field         | Type                  | Required | Notes                                  |
  | :------------ | :-------------------- | :------- | :------------------------------------- |
  | `title`       | `string`              | yes      |                                        |
  | `module`      | enum `E \| P \| T \| R \| A \| G` | yes | Must match a module in `CourseMap.vue` |
  | `order`       | `number`              | yes      | Sort order inside the module           |
  | `description` | `string`              | yes      |                                        |
  | `sources`     | `url[]` (≥ 1)         | yes      | At least one official-doc URL          |
  | `reviewed_at` | date (coerced)        | yes      | Last accuracy review                   |
  | `draft`       | `boolean`             | no       | Defaults to `false`                    |
  | `demo`        | `string`              | no       | Demo JSON filename without the `.json` extension |
  | `component`   | `string`              | no       | Key in the `COMPONENTS` registry       |

- Adding a new lesson is not a single-file change. These places must stay
  in sync:
  1. The lesson Markdown in `src/content/lessons/<slug>.md` **and** its twin in
     `src/content/lessons-en/<slug>.md` (same slug, same numbers).
  2. The `modules` array in `src/components/CourseMap.vue`. All six module
     cards are live and each links to its first lesson via `href`, which
     stores a **locale-neutral** lesson path (`/learn/<slug>/`); `cardHref()`
     prepends `import.meta.env.BASE_URL` and, on the English homepage, the
     `/en` prefix. When a module's launch lesson changes, update only that
     neutral path — do not hard-code a base or locale prefix into `href`.
     The `ctaClass` / `tagClass` colors stay module-fixed. `mvp: true` is
     reserved for the three launch modules E / R / A — their cards show the
     「MVP 首发」 tag and the homepage e2e asserts a count of exactly 3.
  3. The demo JSON in `src/demos/<demo>.json` (only if the lesson uses a
     demo). The slug passed as the `demo` frontmatter must match the
     filename without the extension.
  4. The quiz JSON in `src/content/quizzes/<slug>.json` and
     `src/content/quizzes/en/<slug>.json` (only if the lesson carries a
     课末自测). A lesson without the file simply renders no quiz.

- The `component` frontmatter key picks the demo island (`swimlane` is the
  default). Registering a new demo component requires two edits in
  `[...slug].astro`: a `COMPONENTS` registry entry and a conditional render
  branch — `client:*` directives cannot resolve components through the
  registry (see §5, pitfall 2). TokenCounter lessons (E02/E04/E05/G02) must
  carry `component: "token"` — omitting the key silently renders the
  swimlane island instead (see §5, pitfall 6).

- The site is bilingual. Chinese lessons live in `src/content/lessons/`;
  English lessons live in `src/content/lessons-en/` under the same slugs
  (one pair per lesson — 27 pairs at present, covering all six modules).
  English demo JSON lives in `src/demos/en/` — the
  English lesson page resolves the `demo` frontmatter against
  `src/demos/en/<demo>.json` first and falls back to the root
  `src/demos/<demo>.json`, which is how the e03 English lesson reuses the
  bilingual `src/demos/e03-sampling.json`. A new lesson must be added in
  both languages and kept in sync — content numbers (token counts, costs,
  scores, event counts) must match exactly across the zh/en pair, their
  demo JSONs, and the e2e assertions.

- The course map is fully lit: all six modules (E/P/T/R/A/G) are live, every
  lesson (all 27) carries a complete body, and every card links to its
  module's first lesson. The `mvp` flag now only controls the 「MVP 首发」/
  "MVP launch" badge, which is reserved for the three launch modules E / R / A;
  the P / T / G cards instead show the 「已上线」/Live status badge and keep
  `mvp: false`. Non-MVP cards never carry any 「MVP 首发」 wording. Do not
  flip `mvp` to true for P / T / G — the homepage e2e asserts the 「MVP 首发」
  count is exactly 3.

- Source quality is non-negotiable: every `sources` entry must be the URL
  of an official document (vendor docs, RFCs, peer-reviewed papers, MDN).

- Lesson-body conventions: zh bodies end with a「## 演示数据说明」section and
  en bodies with「## About the demo data」, both declaring which numbers are
  constructed teaching data. Body length is measured as **正文散文 1400–1800
  CJK 字**, where 正文散文 means everything in the body **except fenced code
  blocks and the「带走三句话」框** — section headings count as prose, and link
  URLs never enter the count because the metric is CJK characters. Measured
  over the current 27 lessons that gives 1402–1763. The English body is
  information-equivalent rather than character-counted.
  Every number cited in a body must match the lesson's demo JSON and the e2e
  assertions exactly. Marketing pages, blog posts, and SEO farms are not
  acceptable sources.

- In-site links inside a lesson body are written **base-neutral**: `/learn/<slug>/`
  in Chinese files and `/en/learn/<slug>/` in English files, with no
  `/agentviz` prefix. `src/lib/lesson-body.ts` prepends the base while it
  prepares the rendered HTML, so content never hard-codes the deployment path
  and a base change stays a one-line edit in `astro.config.mjs`. Chinese
  bodies must not link to `/en/…` and vice versa. Astro 7.3's Sätteri markdown
  pipeline no longer accepts legacy remark plugins without an extra package,
  which is why the prefixing happens on the rendered artifact.

- 课末自测 (end-of-lesson quiz): `src/components/QuizBlock.vue` grades in the
  browser from `src/content/quizzes/<slug>.json` (zh) /
  `src/content/quizzes/en/<slug>.json` (en). The schema is fixed by the
  `QuizQuestion` / `QuizData` interfaces exported from the component: a top
  level `questions` array whose entries carry `question`, `options`,
  `answer` (0-based index into `options`) and a one-sentence `explanation`.
  Questions must be answerable from that lesson's own body and demo data —
  never from outside facts — and each `explanation` names the body section it
  comes from, which the e2e suite verifies against the real headings. The
  island renders after the「带走三句话」box and before「演示数据说明」, and
  hydrates with `client:load` on purpose: `client:visible` would leave it
  unhydrated below the fold and break the suite's
  "no `astro-island[ssr]` left" gate.

- Review status (`src/lib/review-status.ts`) is computed at **build time** from
  the lesson's `reviewed_at`: more than 90 days adds a 「建议复审」 hint next to
  the review line, within 21 days puts a 「🌱 最近更新」 badge on the course-index
  card, and the lesson footer always states 「来源核验于 <reviewed_at>」. The
  helper takes `now` as an argument so the thresholds can be tested against a
  fixed clock instead of drifting with the calendar.

## 7. Testing & gates

A change is "done" only when all three of these pass on a clean tree:

```sh
pnpm build           # 0 errors（并在 astro:build:done 里写出 dist/pagefind/ 搜索索引）
pnpm run check       # 0 errors, 0 warnings, 0 hints
pnpm run test:e2e    # 82/82 specs green
```

`pnpm run test:e2e` serves `dist/` through `astro preview`, so the search specs
depend on the Pagefind index that `pnpm build` just wrote — always build
immediately before running the suite.

The Playwright config (see `playwright.config.ts`) covers a single Chromium
project, runs serially, and uses `astro preview` as its `webServer`. Tests
must exercise **real user actions** — for UI changes, "the element exists in
the DOM" is not sufficient; a click, a navigation, or an equivalent state
change must be asserted. Screenshots and traces are retained only on
failure (`trace: 'retain-on-failure'`, `screenshot: 'only-on-failure'`); the
test run should be quiet on green.

For pull requests:

- The diff must be self-explanatory without a separate write-up.
- Include a "How was this verified?" note in the PR body that lists the
  three commands above and their outcomes.
- A UI change must ship a matching test in `tests/`, and that test must
  fail before the change and pass after it.

## 8. Commit discipline

- Commit messages describe **what** changed, **why**, and **how it was
  verified** (e.g. "build/check/test:e2e green"). They do not narrate the
  authoring process, mention any AI assistant or automation tool by name,
  or use first-person framing.
- Keep commits small and topic-coherent. Do not bundle unrelated refactors
  with a feature change.
- The author email for automated commits should be a `noreply` address
  (e.g. a GitHub-provided `users.noreply.github.com` address) so that the
  contribution is attributable but not tied to a personal mailbox.
- Internal planning documents, mission briefs, and other non-public
  artifacts belong outside this repository (`docs/` and `docs/missions/`
  are git-ignored for that reason). Do not commit them here.
