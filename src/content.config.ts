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
	}),
});

export const collections = { lessons, lessonsEn };
