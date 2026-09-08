// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import vue from '@astrojs/vue';

// GitHub Pages serves the site at <owner>.github.io/agentviz/, so Astro needs
// to know its root is a sub-path. Static asset URLs must be prefixed with it;
// `import.meta.env.BASE_URL` carries that prefix.
const base = '/agentviz';

/**
 * Pagefind indexes the static output after `astro build`, writing the search
 * bundle to dist/pagefind/. Current official shape: drive the Node API from an
 * astro:build:done hook — no third-party integration package, and the index is
 * always built from the fresh output. The dev server never fires this hook, so
 * local development doesn't pay the indexing cost.
 */
// Fontsource packages ship every face in woff2 + legacy woff. woff2 is
// supported by every browser since ~2016, so the 50 woff files (~780 KB) in
// dist are dead weight — and their CSS fallback references are unreachable
// (a browser that needed woff would never have loaded this page anyway).
// This integration strips both the files and the dangling `url(...woff)
// format("woff")` fallbacks from the built CSS. Ordering matters: it must run
// BEFORE the Pagefind integration so the index never picks up pruned files.
// A canary fails the build if the regex no longer matches the CSS shape.
/** @type {import('astro').AstroIntegration} */
const woffSlim = {
	name: 'agentviz-woff-slim',
	hooks: {
		'astro:build:done': async () => {
			const fs = await import('node:fs/promises');
			const path = await import('node:path');

			const outDir = 'dist';
			/** @type {string[]} */
			const cssFiles = [];
			/** @param {string} dir */
			const walk = async (dir) => {
				for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
					const p = path.join(dir, entry.name);
					if (entry.isDirectory()) await walk(p);
					else if (entry.name.endsWith('.woff')) await fs.rm(p);
					else if (entry.name.endsWith('.css')) cssFiles.push(p);
				}
			};
			await walk(outDir);

			// Two minified fallback shapes to strip:
			// 1. `,url(<x>.woff)format("woff")` — file-backed fallback appended
			//    to a woff2 src list. `\.woff\)` cannot match `.woff2)`.
			// 2. `,url(data:font/woff;base64,<...>)format("woff")` — Vite inlines
			//    tiny assets as data URIs, so small faces (JetBrains Mono 400)
			//    never materialize as files. `font/woff;` does not match
			//    `font/woff2;`.
			const WOFF_FALLBACKS = [
				/,url\([^)]*\.woff\)format\("woff"\)/g,
				/,url\(data:font\/woff;base64,[^)]*\)format\("woff"\)/g
			];
			let cleaned = 0;
			for (const file of cssFiles) {
				const css = await fs.readFile(file, 'utf8');
				const next = WOFF_FALLBACKS.reduce((acc, re) => acc.replace(re, ''), css);
				if (next !== css) {
					await fs.writeFile(file, next);
					cleaned++;
				}
			}
			// Canary: every shipped face pairs woff2+woff, so a build whose CSS
			// no longer matches this shape means the regex rotted — stop here.
			if (cleaned === 0) {
				throw new Error(
					'woff-slim: no CSS contained a woff fallback — minifier shape changed? Inspect dist CSS before shipping.'
				);
			}
			console.log(`woff-slim：已移除 woff 文件与 CSS 兜底引用（${cleaned} 个 CSS 清理）`);
		}
	}
};

/** @type {import('astro').AstroIntegration} */
const pagefind = {
	name: 'agentviz-pagefind',
	hooks: {
		'astro:build:done': async () => {
			const { createIndex, close } = await import('pagefind');
			const { index, errors: indexErrors } = await createIndex();
			if (!index) {
				throw new Error(`Pagefind 索引服务启动失败：${JSON.stringify(indexErrors)}`);
			}
			const added = await index.addDirectory({ path: 'dist' });
			const written = await index.writeFiles({ outputPath: 'dist/pagefind' });
			await close();
			if (added.errors.length > 0) {
				throw new Error(`Pagefind 索引失败：${JSON.stringify(added.errors)}`);
			}
			if (written.errors.length > 0) {
				throw new Error(`Pagefind 写出索引失败：${JSON.stringify(written.errors)}`);
			}
			console.log(`Pagefind：已索引 ${added.page_count} 页 → ${base}/pagefind/`);
		}
	}
};

// https://astro.build/config
export default defineConfig({
	// GitHub Pages origin. Update if the repo ends up under a different owner/org,
	// or drop `base` entirely when a custom domain is used.
	site: 'https://classkow.github.io',
	base,

	// Chinese is the default locale served at the site root; English lives under
	// `/en/` (`prefixDefaultLocale: false` keeps the default unprefixed).
	i18n: {
		defaultLocale: 'zh',
		locales: ['zh', 'en'],
		routing: {
			prefixDefaultLocale: false
		}
	},

	vite: {
		plugins: [tailwindcss()]
	},

	integrations: [woffSlim, vue(), pagefind]
});
