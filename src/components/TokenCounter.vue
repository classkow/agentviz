<script lang="ts">
/**
 * E02 token 解剖的演示数据类型（页面演示槽通过 as unknown as 桥接使用）。
 * 形状对应 src/demos/e02-token-anatomy.json。
 */
export interface TokenGroup {
	id: string;
	label: string;
	text: string;
	tokenCount: number;
	note: string;
}

export interface TokenDemo {
	title: string;
	groups: TokenGroup[];
	costPerMillion: number;
}
</script>

<script setup lang="ts">
import { computed, ref } from 'vue';

const props = defineProps<{ demo: TokenDemo; /** UI copy language for labels and aria-labels; 'zh' keeps the original rendering. */ ui?: 'zh' | 'en' }>();

// UI copy dictionary: 'zh' (default) keeps the original strings; 'en' swaps
// user-visible labels and aria-labels. No logic or structural changes.
const UI_COPY = {
	zh: {
		root: 'token 解剖台',
		chooseGroup: '选择示例文本',
		panel: 'token 解析面板',
		sourceText: '原文',
		segmentation: 'token 切分示意',
		strip: 'token 切分条',
		segmentTitle: (n: number) => `第 ${n} 枚`,
		stats: (chars: number, tokens: number, avg: string) =>
			`字符数 ${chars}（按 code point 计）· token 数 ${tokens} · 平均 ${avg} token/字符`,
		requests: '请求数（次）',
		costAria: '估算输入成本',
		costLine: (cost: string) => `输入成本 ≈ ¥${cost}`,
		rateLine: (rate: number) => `费率 ¥${rate}/百万 token（示例费率，非报价）`,
		disclaimer: 'token 数与切分边界均为教学示意，非真实 tokenizer 输出。'
	},
	en: {
		root: 'Token anatomy bench',
		chooseGroup: 'Choose an example text',
		panel: 'token analysis panel',
		sourceText: 'Source text',
		segmentation: 'Illustrative token segmentation',
		strip: 'token segmentation strip',
		segmentTitle: (n: number) => `Segment ${n}`,
		stats: (chars: number, tokens: number, avg: string) =>
			`Characters ${chars} (by code point) · tokens ${tokens} · avg ${avg} tokens/char`,
		requests: 'Requests',
		costAria: 'Estimated input cost',
		costLine: (cost: string) => `Estimated input cost ≈ ¥${cost}`,
		rateLine: (rate: number) => `Rate ¥${rate}/M tokens (example rate, not a quote)`,
		disclaimer:
			'Token counts and segmentation boundaries are illustrative teaching data, not real tokenizer output.'
	}
} as const;
const t = computed(() => (props.ui === 'en' ? UI_COPY.en : UI_COPY.zh));

const activeIndex = ref(0);
const requests = ref(1000); // 请求数输入：min 100，step 100，默认 1000

const activeGroup = computed(() => props.demo.groups[activeIndex.value] ?? null);

// 字符数按 code point 计（[...text].length），与 JS 的 UTF-16 length 区分，
// emoji 等代理对字符才不会被数成两个。
const charCount = computed(() => (activeGroup.value ? [...activeGroup.value.text].length : 0));

const avgTokensPerChar = computed(() => {
	const group = activeGroup.value;
	if (!group || charCount.value === 0) return '0.00';
	return (group.tokenCount / charCount.value).toFixed(2);
});

type CharClass = 'cjk' | 'digit' | 'space' | 'symbol';

function classify(ch: string): CharClass {
	if (/\s/u.test(ch)) return 'space';
	if (/[㐀-䶿一-鿿豈-﫿]/u.test(ch)) return 'cjk';
	if (/[0-9]/u.test(ch)) return 'digit';
	return 'symbol';
}

/**
 * 示意切分规则（教学演示，非真实 tokenizer 输出）：
 * - 中文字符每 1.5 个一枚（末尾不足 1.5 亦成一枚，run 内按 2/1/2/1… 均分）
 * - 英文按空白分词后每个空白词一枚
 * - 数字串每 4 字符一枚
 * - 其他非空白符号每枚一个
 */
function baseSegments(text: string): string[] {
	const chars = [...text];
	const segs: string[] = [];
	let i = 0;
	while (i < chars.length) {
		const ch = chars[i];
		if (classify(ch) === 'space') {
			i++;
			continue;
		}
		if (/[A-Za-z]/u.test(ch)) {
			// 英文词：消费到下一个空白符为止，整个空白词一枚
			let j = i;
			while (j < chars.length && classify(chars[j]) !== 'space') j++;
			segs.push(chars.slice(i, j).join(''));
			i = j;
			continue;
		}
		const cls = classify(ch);
		if (cls === 'cjk') {
			let j = i;
			while (j < chars.length && classify(chars[j]) === 'cjk') j++;
			const run = chars.slice(i, j);
			const n = Math.ceil(run.length / 1.5);
			for (let k = 0; k < n; k++) {
				const start = Math.round((k * run.length) / n);
				const end = Math.round(((k + 1) * run.length) / n);
				if (end > start) segs.push(run.slice(start, end).join(''));
			}
			i = j;
			continue;
		}
		if (cls === 'digit') {
			let j = i;
			while (j < chars.length && classify(chars[j]) === 'digit') j++;
			const run = chars.slice(i, j);
			for (let k = 0; k < run.length; k += 4) {
				segs.push(run.slice(k, k + 4).join(''));
			}
			i = j;
			continue;
		}
		segs.push(ch);
		i++;
	}
	return segs;
}

/**
 * 六组示例的 tokenCount 是教学示意值，任何固定切分规则都无法同时与六组吻合，
 * 因此先按示意规则切出基础边界，再归并最短相邻对 / 细分最长段，把枚数对齐到
 * 该组的 tokenCount——切分条上的边界是示意边界，真实边界由具体 tokenizer 决定。
 */
function alignSegments(segs: string[], target: number): string[] {
	const result = [...segs];
	while (result.length > target && result.length > 1) {
		let best = 0;
		let bestLen = Infinity;
		for (let k = 0; k + 1 < result.length; k++) {
			const len = result[k].length + result[k + 1].length;
			if (len < bestLen) {
				bestLen = len;
				best = k;
			}
		}
		result.splice(best, 2, result[best] + result[best + 1]);
	}
	while (result.length < target) {
		let best = -1;
		let bestLen = 1;
		for (let k = 0; k < result.length; k++) {
			const pointLen = [...result[k]].length;
			if (pointLen > bestLen) {
				bestLen = pointLen;
				best = k;
			}
		}
		if (best === -1) break; // 每段都只剩单个 code point，再拆会拆碎代理对
		const points = [...result[best]];
		const half = Math.ceil(points.length / 2);
		result.splice(best, 1, points.slice(0, half).join(''), points.slice(half).join(''));
	}
	return result;
}

const segments = computed(() => {
	const group = activeGroup.value;
	if (!group) return [];
	return alignSegments(baseSegments(group.text), group.tokenCount);
});

// 计费：requests × tokenCount × costPerMillion / 1_000_000（示例费率，非报价）
const estimatedCost = computed(() => {
	const group = activeGroup.value;
	if (!group) return '0.0000';
	const n =
		typeof requests.value === 'number' && Number.isFinite(requests.value) ? requests.value : 0;
	return ((n * group.tokenCount * props.demo.costPerMillion) / 1_000_000).toFixed(4);
});

function selectGroup(index: number) {
	activeIndex.value = index;
}

const groupButtonBaseClass =
	'flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400';
const groupButtonActiveClass = 'border-sky-400/60 bg-sky-400/10 text-sky-200';
const groupButtonIdleClass =
	'border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100';
</script>

<template>
	<section
		class="token-root mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6"
		:aria-label="t.root"
	>
		<div class="flex flex-wrap items-baseline gap-x-4 gap-y-1">
			<h2 class="text-lg font-semibold text-zinc-100">{{ demo.title }}</h2>
		</div>

		<div class="mt-6 grid gap-6 md:grid-cols-2">
			<!-- 左栏：示例组选择 -->
			<div class="flex flex-col gap-2" role="group" :aria-label="t.chooseGroup">
				<button
					v-for="(g, i) in demo.groups"
					:key="g.id"
					type="button"
					:aria-pressed="i === activeIndex"
					:class="[
						groupButtonBaseClass,
						i === activeIndex ? groupButtonActiveClass : groupButtonIdleClass
					]"
					@click="selectGroup(i)"
				>
					<span>{{ g.label }}</span>
					<span
						class="shrink-0 rounded-full border border-sky-400/40 bg-sky-400/10 px-2 py-0.5 font-mono text-xs text-sky-300"
					>
						{{ g.tokenCount }} tokens
					</span>
				</button>
			</div>

			<!-- 右栏：解析面板 -->
			<div
				class="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4"
				aria-live="polite"
				:aria-label="t.panel"
			>
				<template v-if="activeGroup">
					<h3 class="text-xs font-semibold tracking-wide text-zinc-400 uppercase">{{ t.sourceText }}</h3>
					<p
						class="mt-2 rounded-md bg-zinc-900/60 p-3 font-mono text-sm leading-relaxed break-words whitespace-pre-wrap text-zinc-100"
					>
						{{ activeGroup.text }}
					</p>

					<h3 class="mt-4 text-xs font-semibold tracking-wide text-zinc-400 uppercase">
						{{ t.segmentation }}
					</h3>
					<div class="mt-2 flex flex-wrap gap-0.5" :aria-label="t.strip">
						<span
							v-for="(seg, i) in segments"
							:key="i"
							:title="t.segmentTitle(i + 1)"
							class="rounded border border-sky-400/40 bg-sky-400/10 px-1 py-0.5 font-mono text-xs text-sky-200"
						>
							{{ seg }}
						</span>
					</div>

					<p class="mt-3 font-mono text-xs text-zinc-400">
						{{ t.stats(charCount, activeGroup.tokenCount, avgTokensPerChar) }}
					</p>
					<p class="mt-2 text-xs text-zinc-500">{{ activeGroup.note }}</p>

					<!-- 计费小卡片 -->
					<div class="mt-4 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
						<div class="flex flex-wrap items-center justify-between gap-3">
							<label for="token-requests" class="text-xs font-medium text-zinc-300">
								{{ t.requests }}
							</label>
							<input
								id="token-requests"
								v-model.number="requests"
								type="number"
								min="100"
								step="100"
								class="w-28 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono text-sm text-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
							/>
						</div>
						<p class="mt-2 font-mono text-sm text-sky-300" :aria-label="t.costAria">
							{{ t.costLine(estimatedCost) }}
						</p>
						<p class="mt-1 text-xs text-zinc-500">
							{{ t.rateLine(demo.costPerMillion) }}
						</p>
					</div>

					<p class="mt-3 text-xs text-zinc-500">
						{{ t.disclaimer }}
					</p>
				</template>
			</div>
		</div>
	</section>
</template>

<style scoped>
@media (prefers-reduced-motion: reduce) {
	.token-root,
	.token-root * {
		transition: none !important;
		animation: none !important;
	}
}
</style>
