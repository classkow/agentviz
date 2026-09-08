import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * 内容准确性是全站命门：sources 与 reviewed_at 为强制字段，
 * 任一课程缺失（sources 为空数组也算）都会在 build 时由 Zod 校验直接失败。
 */
const lessons = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/lessons' }),
  schema: z.object({
    title: z.string(),
    module: z.enum(['E', 'P', 'T', 'R', 'A', 'G']),
    order: z.number(),
    description: z.string(),
    sources: z.array(z.url()).min(1),
    reviewed_at: z.coerce.date(),
    draft: z.boolean().default(false),
    demo: z.string().optional(),
    // 演示组件注册表键名（对应 [...slug].astro 里的 COMPONENTS），缺省 'swimlane'
    component: z.string().optional(),
    // 以下两项均为可选：不设值的老 frontmatter 照样通过校验。
    // 正文（不含代码块）的预计阅读分钟数。
    readingMinutes: z.number().int().positive().optional(),
    // 难度档：入门 / 进阶 / 实战。
    level: z.enum(['intro', 'intermediate', 'practice']).optional(),
    // 站内搜索自造词（可选）：Pagefind 浏览器端 zh 无分词 wasm，整词查不到
    // （UI 按单字 AND 兜底），这里声明行业自造词，模板转成单字空格分隔的
    // data-pagefind-meta 注入索引。仅搜 sparingly 用，正式术语（如 token）不需要。
    keywords: z.array(z.string()).min(1).optional(),
  }),
});

/**
 * 英文版课程集合：slug 与中文课成对（同名），正文为英文；
 * schema 与中文 lessons 保持一致。演示数据放 src/demos/en/（e03 例外复用根 JSON）。
 */
const lessonsEn = defineCollection({
	loader: glob({ pattern: '**/*.md', base: './src/content/lessons-en' }),
	schema: z.object({
		title: z.string(),
		module: z.enum(['E', 'P', 'T', 'R', 'A', 'G']),
		order: z.number(),
		description: z.string(),
		sources: z.array(z.url()).min(1),
		reviewed_at: z.coerce.date(),
		draft: z.boolean().default(false),
		demo: z.string().optional(),
		component: z.string().optional(),
		// Both optional, so pre-existing frontmatter still validates. English
		// readingMinutes is derived from the prose word count.
		readingMinutes: z.number().int().positive().optional(),
		level: z.enum(['intro', 'intermediate', 'practice']).optional(),
		// Coined search terms (optional): the browser-side zh index has no
		// segmentation wasm, so multi-char coined words are unfindable (the UI
		// falls back to per-char AND). Declared terms are injected as
		// space-separated chars via data-pagefind-meta by the lesson template.
		keywords: z.array(z.string()).min(1).optional(),
	}),
});

export const collections = { lessons, lessonsEn };
