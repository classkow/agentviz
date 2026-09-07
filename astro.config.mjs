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

	integrations: [vue(), pagefind]
});
