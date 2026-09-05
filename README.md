# AgentViz

*Interactive visual lessons for AI application development* · 《Agent 可视化》

AgentViz 是一个交互式可视化课程平台：把 AI 应用开发中看不见的 API 调用、Agent 循环、数据流，变成可播放、可交互的动画。

A static-first course site built with [Astro](https://astro.build/): written as an Astro + TypeScript (strict) + Tailwind CSS 4 project, with Vue 3 components mounted as [islands](https://docs.astro.build/en/concepts/islands/) wherever a lesson needs to be manipulated rather than merely read.

## Status

<!-- Status badges go here once the GitHub repository exists, e.g.: -->
<!-- [![CI](https://github.com/<owner>/agentviz/actions/workflows/ci.yml/badge.svg)](https://github.com/<owner>/agentviz/actions/workflows/ci.yml) -->
<!-- [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE) -->

> Early scaffold — the site is a placeholder until the first lessons land.

## Prerequisites

- Node.js `>=22.12.0` (Astro 7 requirement — see the [`engines` field](./package.json))
- [pnpm](https://pnpm.io/installation)

## Development

| Command          | Action                                                                        |
| :--------------- | :---------------------------------------------------------------------------- |
| `pnpm install`   | Install dependencies                                                        |
| `pnpm dev`       | Start the dev server at `localhost:4321/agentviz` with hot reload             |
| `pnpm build`     | Build the static site into `./dist/`                                          |
| `pnpm preview`   | Preview the production build locally                                          |
| `pnpm check`     | Run `astro check` — type and diagnostics check across `.astro` / `.ts` files |

The dev server opens at `/agentviz`, not `/`: `base` is set for the GitHub Pages sub-path, so Astro serves the site there and only prints a pointer at the port root.

## Project structure

```
.
├── .github/workflows/    CI and GitHub Pages deployment
├── public/               Static assets, copied to the site root as-is
├── src/
│   ├── components/       Interactive islands (Vue 3 components)
│   ├── content/          Course content (reserved for Astro content collections)
│   ├── pages/            Site pages — one file per route
│   └── styles/           Global stylesheet (Tailwind CSS 4 entry point)
├── astro.config.mjs      Integrations, plus `site` / `base` for GitHub Pages
├── LICENSE               MIT (code) — course content is CC BY 4.0
└── tsconfig.json         TypeScript project setup (strict)
```

`src/pages/index.astro` imports `src/styles/global.css`, and that import is what makes Tailwind classes available on a page — an Astro layout will take over once there is more than one page.

## Deployment

Pushing to `main` runs [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml), which builds the site with the official [withastro/action](https://docs.astro.build/en/guides/deploy/github/) and publishes it to GitHub Pages under `/agentviz`.

## License

- Code in this repository: **MIT** — see [LICENSE](./LICENSE).
- Course content (lessons, text, diagrams): **CC BY 4.0**.
