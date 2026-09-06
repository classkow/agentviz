// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import vue from '@astrojs/vue';

// https://astro.build/config
export default defineConfig({
  // GitHub Pages origin. Update if the repo ends up under a different owner/org,
  // or drop `base` entirely when a custom domain is used.
  site: 'https://classkow.github.io',
  // GitHub Pages serves the site at <owner>.github.io/agentviz/, so Astro needs
  // to know its root is a sub-path. Static asset URLs must be prefixed with it;
  // `import.meta.env.BASE_URL` carries that prefix.
  base: '/agentviz',

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

  integrations: [vue()]
});