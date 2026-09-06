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
│   │   ├── learn/            Course index and dynamic lesson route
│   │   │   ├── index.astro
│   │   │   └── [...slug].astro   Renders any entry from src/content/lessons/
│   │   └── lab/              Sandboxes that mount a single demo component
│   ├── components/       Interactive islands (Vue 3) and shared Astro parts
│   │   ├── CourseMap.vue         Homepage course grid (single source of truth
│   │                            for module metadata; see §6)
│   │   ├── SwimlaneTimeline.vue  Generic timeline demo
│   │   ├── SamplingLab.vue       Sampling-parameter sandbox
│   │   ├── TokenCounter.vue        Token statistics demo (token anatomy)
│   │   ├── SiteHeader.astro
│   │   └── SiteFooter.astro
│   ├── layouts/          Base.astro (shared shell)
│   ├── content/          Content collections
│   │   ├── content.config.ts     Zod schema for the lessons collection
│   │   └── lessons/              Markdown lessons, one file per entry
│   ├── demos/            JSON payloads consumed by demo components
│   └── styles/           global.css — Tailwind v4 entry point and @theme tokens
├── tests/                Playwright specs and screenshot fixtures
├── astro.config.mjs      Integrations + `site` / `base` for GitHub Pages
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
  | A      | `amber-400`  | Agents & MCP                 |
  | G      | `rose-400`   | Production engineering       |

  The font stack is declared in `src/styles/global.css` via `@theme`
  (`--font-sans`, `--font-mono`); add new typographic tokens there, not in
  component-level styles.

## 5. Known pitfalls

These are the five recurring traps in this repo. Read them before touching
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
   - Keep `SwimlaneTimeline.vue` and `SamplingLab.vue` as static imports in
     `src/pages/learn/[...slug].astro` and select between them via a small
     `if`/`switch` on the lesson frontmatter `component` key.
   - Use `import.meta.glob` only for **data** — currently
     `src/demos/*.json`.

3. **`import.meta.glob` paths are layer-sensitive and empties are silent.**
   `import.meta.glob` resolves relative to the file it is written in, so
   a glob written from `src/pages/learn/[...slug].astro` must reach up two
   levels to find `src/demos/`: `../../demos/*.json`. Write the path wrong
   and the build still succeeds — the matched set is just empty, and the
   lesson page silently renders without its demo. After any change to a
   glob, confirm the keys it returns match what the consumer expects.

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
  | `demo`        | `string`              | no       | Filename of a JSON in `src/demos/`     |
  | `component`   | `string`              | no       | Key in the `COMPONENTS` registry       |

- Adding a new lesson is not a single-file change. Three places must stay
  in sync:
  1. The lesson Markdown in `src/content/lessons/<slug>.md`.
  2. The `modules` array in `src/components/CourseMap.vue` — if the new
     lesson is an MVP launch for a module, point that module's `href` at
     it; otherwise leave the module listed as planned.
  3. The demo JSON in `src/demos/<demo>.json` (only if the lesson uses a
     demo). The slug passed as the `demo` frontmatter must match the
     filename without the extension.

- Source quality is non-negotiable: every `sources` entry must be the URL
  of an official document (vendor docs, RFCs, peer-reviewed papers, MDN).
  Marketing pages, blog posts, and SEO farms are not acceptable sources.

## 7. Testing & gates

A change is "done" only when all three of these pass on a clean tree:

```sh
pnpm build           # 0 errors
pnpm run check       # 0 errors, 0 warnings, 0 hints
pnpm run test:e2e    # 4/4 specs green
```

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
