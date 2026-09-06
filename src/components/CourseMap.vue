<script setup lang="ts">
interface CourseModule {
	letter: string;
	zh: string;
	en: string;
	lessons: number;
	blurb: string;
	// English blurb shown when the map renders with locale="en".
	blurbEn: string;
	mvp: boolean;
	// MVP modules link to their launch lesson; planned modules stay unclickable.
	href?: string;
	// Full Tailwind class names are kept as literal strings so the v4 scanner sees them.
	badgeClass: string;
	hoverBorderClass: string;
	tagClass: string;
	ctaClass?: string;
}

// locale="en" swaps card titles/blurbs/labels to English; the default keeps
// the Chinese homepage byte-identical to its pre-locale rendering.
const props = withDefaults(defineProps<{ locale?: 'zh' | 'en' }>(), { locale: 'zh' });

// BASE_URL is '/agentviz' without a trailing slash, so lesson paths add one.
const base = import.meta.env.BASE_URL;

const modules: CourseModule[] = [
	{
		letter: 'E',
		zh: '地基：和 LLM 对话',
		en: 'LLM Foundations',
		lessons: 5,
		blurb: '一次请求的完整旅程：token、采样、上下文',
		blurbEn: 'Requests, tokens, sampling, context — the minimal LLM vocabulary',
		mvp: true,
		href: `${base}/learn/e01-request-journey/`,
		badgeClass: 'bg-sky-400/15 text-sky-400',
		hoverBorderClass: 'hover:border-sky-400/60',
		tagClass: 'bg-sky-400/15 text-sky-400',
		ctaClass: 'text-sky-400'
	},
	{
		letter: 'P',
		zh: 'Prompt 工程',
		en: 'Prompt Engineering',
		lessons: 4,
		blurb: '把需求说清楚的艺术：结构、示例、思维链',
		blurbEn: 'Saying what you mean: structure, examples, chain of thought',
		mvp: false,
		badgeClass: 'bg-cyan-400/15 text-cyan-400',
		hoverBorderClass: 'hover:border-cyan-400/60',
		tagClass: 'bg-zinc-800 text-zinc-500'
	},
	{
		letter: 'T',
		zh: 'Tool Calling',
		en: 'Tool Calling',
		lessons: 3,
		blurb: '模型的手：函数调用、并行与容错',
		blurbEn: "The model's hands: function calling, parallelism, retries",
		mvp: false,
		badgeClass: 'bg-emerald-400/15 text-emerald-400',
		hoverBorderClass: 'hover:border-emerald-400/60',
		tagClass: 'bg-zinc-800 text-zinc-500'
	},
	{
		letter: 'R',
		zh: 'RAG',
		en: 'Retrieval-Augmented Generation',
		lessons: 5,
		blurb: '给模型开卷考试：检索、切块、重排',
		blurbEn: 'Open-book exams for models: retrieval, chunking, reranking',
		mvp: true,
		href: `${base}/learn/r01-rag-pipeline/`,
		badgeClass: 'bg-violet-400/15 text-violet-400',
		hoverBorderClass: 'hover:border-violet-400/60',
		tagClass: 'bg-violet-400/15 text-violet-400',
		ctaClass: 'text-violet-400'
	},
	{
		letter: 'A',
		zh: 'Agent',
		en: 'Agents & MCP',
		lessons: 7,
		blurb: '会自己干活的模型：ReAct 循环、记忆、多智能体',
		blurbEn: 'Models that work on their own: ReAct loops, memory, agents',
		mvp: true,
		href: `${base}/learn/a01-agent-loop/`,
		badgeClass: 'bg-amber-400/15 text-amber-400',
		hoverBorderClass: 'hover:border-amber-400/60',
		tagClass: 'bg-amber-400/15 text-amber-400',
		ctaClass: 'text-amber-400'
	},
	{
		letter: 'G',
		zh: '工程化',
		en: 'Production Engineering',
		lessons: 3,
		blurb: '上线三件事：评估、成本、护栏',
		blurbEn: 'Shipping: evaluation, cost, guardrails',
		mvp: false,
		badgeClass: 'bg-rose-400/15 text-rose-400',
		hoverBorderClass: 'hover:border-rose-400/60',
		tagClass: 'bg-zinc-800 text-zinc-500'
	}
];
</script>

<template>
	<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
		<component
			:is="mod.href ? 'a' : 'div'"
			v-for="mod in modules"
			:key="mod.letter"
			:href="mod.href"
			:class="[
				'group flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-6 transition duration-200',
				mod.href ? `hover:-translate-y-1 ${mod.hoverBorderClass}` : 'cursor-default opacity-75'
			]"
		>
			<div class="flex items-start justify-between">
				<span
					:class="[
						'flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold',
						mod.badgeClass
					]"
				>
					{{ mod.letter }}
				</span>
				<span
					:class="[
						'rounded-full px-2.5 py-1 text-xs font-medium',
						mod.tagClass
					]"
				>
					{{ props.locale === 'en' ? (mod.mvp ? 'MVP launch' : 'Planned') : mod.mvp ? 'MVP 首发' : '规划中' }}
				</span>
			</div>
			<div>
				<h3 class="text-lg font-semibold text-zinc-100">
					{{ props.locale === 'en' ? mod.en : mod.zh }}
				</h3>
				<p class="mt-0.5 text-sm text-zinc-400">
					{{ props.locale === 'en' ? mod.zh : mod.en }}
				</p>
			</div>
			<p class="text-sm leading-relaxed text-zinc-400">
				{{ props.locale === 'en' ? mod.blurbEn : mod.blurb }}
			</p>
			<p v-if="mod.href" :class="['text-xs', mod.ctaClass]">
				{{ props.locale === 'en' ? 'Start the lesson →' : '进入首发课 →' }}
			</p>
			<p class="mt-auto text-xs text-zinc-500">
				{{ mod.lessons }} {{ props.locale === 'en' ? 'lessons' : '课' }}
			</p>
		</component>
	</div>
</template>

