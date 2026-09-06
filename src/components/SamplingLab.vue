<script lang="ts">
/**
 * E03 采样实验室的演示数据类型（页面演示槽通过 as unknown as 桥接使用）。
 * 形状对应 src/demos/e03-sampling.json。
 */
export interface SamplingCandidate {
	token: string;
	logit: number;
}

export interface SamplingPrompt {
	text: string;
	candidates: SamplingCandidate[];
}

export interface DemoData {
	title: string;
	note?: string;
	prompts: SamplingPrompt[];
}
</script>

<script setup lang="ts">
import { computed, ref } from 'vue';

const props = defineProps<{ demo: DemoData; /** UI copy language for labels and aria-labels; 'zh' keeps the original rendering. */ ui?: 'zh' | 'en' }>();

// UI copy dictionary: 'zh' (default) keeps the original strings; 'en' swaps
// user-visible labels, hints, and aria-labels. No logic or structural changes.
// (The `t` inside `rows` below is the local temperature — unrelated to this.)
const UI_COPY = {
	zh: {
		root: '采样实验室',
		choosePrompt: '选择示例 prompt',
		tempLabel: 'temperature 温度',
		tempHint: '调小→分布尖锐（更确定），调大→分布平坦（更随机）',
		topKLabel: 'top-k 截断数',
		topKHint: '只保留概率最高的 k 个候选再归一化',
		topPLabel: 'top-p 累积概率',
		topPHint: '从最大概率开始累加，达到 p 即封口（动态候选数）',
		presetsHeading: '温度对照',
		presetsGroup: '温度预设快捷按钮',
		presetLow: '预设温度 0.2：低温档',
		presetMid: '预设温度 1.0：标准档',
		presetHigh: '预设温度 2.0：高温档',
		presetLowText: '0.2 低温',
		presetMidText: '1.0 标准',
		presetHighText: '2.0 高温',
		controlsGroup: '采样控制',
		sample: '采样一次',
		sampleAria: '按当前分布采样一次',
		reset: '重置输出',
		resetAria: '重置生成输出',
		outputHeading: '生成输出',
		sampled: (n: number) => `已采样 ${n} 个 token`,
		outputAria: '生成输出文本',
		chartHeading: '下一个 token 的概率分布',
		meterProb: (token: string, p: string) => `${token}：概率 ${p}`,
		meterCut: (token: string, by: string | null) => `${token}：已被 ${by} 截断`,
		truncated: (by: string | null) => `已截断（${by}）`,
		legend:
			'紫色 = 当前最高概率的候选；灰字「已截断」= 被 top-k / top-p 过滤掉的候选，不再参与归一化与采样。'
	},
	en: {
		root: 'Sampling lab',
		choosePrompt: 'Choose an example prompt',
		tempLabel: 'temperature',
		tempHint: 'Smaller → sharper distribution (more deterministic); larger → flatter (more random)',
		topKLabel: 'top-k cutoff',
		topKHint: 'Keep only the k highest-probability candidates, then renormalize',
		topPLabel: 'top-p cumulative probability',
		topPHint:
			'Accumulate from the highest probability and cap once p is reached (dynamic candidate count)',
		presetsHeading: 'Temperature presets',
		presetsGroup: 'Temperature preset buttons',
		presetLow: 'Preset temperature 0.2: low',
		presetMid: 'Preset temperature 1.0: standard',
		presetHigh: 'Preset temperature 2.0: high',
		presetLowText: '0.2 Low',
		presetMidText: '1.0 Standard',
		presetHighText: '2.0 High',
		controlsGroup: 'Sampling controls',
		sample: 'Sample once',
		sampleAria: 'Sample once from the current distribution',
		reset: 'Reset output',
		resetAria: 'Reset the generated output',
		outputHeading: 'Generated output',
		sampled: (n: number) => `${n} ${n === 1 ? 'token' : 'tokens'} sampled`,
		outputAria: 'Generated output text',
		chartHeading: 'Probability distribution for the next token',
		meterProb: (token: string, p: string) => `${token}: probability ${p}`,
		meterCut: (token: string, by: string | null) => `${token}: cut by ${by}`,
		truncated: (by: string | null) => `Cut (${by})`,
		legend:
			'Violet = the current top-probability candidate; grey entries marked "Cut" were filtered out by top-k / top-p and no longer take part in renormalization or sampling.'
	}
} as const;
const t = computed(() => (props.ui === 'en' ? UI_COPY.en : UI_COPY.zh));

// —— 参数状态（任务包规定的量程与默认值）——
const activeIndex = ref(0);
const temperature = ref(1.0); // 0.1 ~ 2.0，步 0.05
const topK = ref(12); // 1 ~ 候选数（本演示 12），默认 12 = 全保留
const topP = ref(1.0); // 0.05 ~ 1.0，步 0.05
const outputTokens = ref<string[]>([]);

const activePrompt = computed(() => props.demo.prompts[activeIndex.value] ?? null);
const maxTopK = computed(() => activePrompt.value?.candidates.length ?? 12);

interface DistributionRow {
	token: string;
	/** 归一化后的最终概率（0~1），被截断的候选为 0 */
	prob: number;
	kept: boolean;
	/** 被哪个参数截断（仅 kept=false 时有值） */
	cutBy: 'top-k' | 'top-p' | null;
	isTop: boolean;
}

/**
 * 核心计算：softmax(logit/T) → top-k 截断 → top-p 累积截断 → 归一化。
 * 这个串联顺序是 HuggingFace transformers 生成流水线的惯例
 * （TemperatureLogitsWarper → TopKLogitsWarper → TopPLogitsWarper），
 * 三步都在「按概率降序排列」的序列上进行，因此存活者永远是降序前缀。
 */
const rows = computed<DistributionRow[]>(() => {
	const prompt = activePrompt.value;
	if (!prompt) return [];

	const t = temperature.value;
	const k = topK.value;
	const p = topP.value;

	// 1) 温度缩放后 softmax（减去最大值做数值稳定，不改变分布形状）
	const scaled = prompt.candidates.map((c) => c.logit / t);
	const maxScaled = Math.max(...scaled);
	const exps = scaled.map((s) => Math.exp(s - maxScaled));
	const sumExp = exps.reduce((acc, e) => acc + e, 0);
	const probs = exps.map((e) => e / sumExp);

	// 2) 按概率降序排候选下标
	const order = prompt.candidates.map((_, i) => i).sort((a, b) => probs[b] - probs[a]);

	// 3) top-k 硬截断：只留前 k 个
	const keptByK = new Set(order.slice(0, Math.min(k, order.length)));

	// 4) top-p 累积截断：在 top-k 存活者中从大到小累加，累计达到 p 为止；
	//    跨过阈值的那一枚按 HF 惯例保留（先判 cum < p 再累加）。p >= 1 视为不过滤。
	const keptByP = new Set<number>();
	let cum = 0;
	for (const i of order) {
		if (!keptByK.has(i)) continue;
		if (p >= 1 || cum < p) {
			keptByP.add(i);
			cum += probs[i];
		}
	}

	// 5) 归一化存活者，得到最终采样分布
	const keptTotal = order.reduce((acc, i) => (keptByP.has(i) ? acc + probs[i] : acc), 0);

	return order.map((i, rank) => {
		const kept = keptByP.has(i);
		return {
			token: prompt.candidates[i].token,
			prob: kept ? probs[i] / keptTotal : 0,
			kept,
			cutBy: kept ? null : keptByK.has(i) ? 'top-p' : 'top-k',
			isTop: kept && rank === 0
		};
	});
});

const keptRows = computed(() => rows.value.filter((row) => row.kept));

function percentLabel(prob: number): string {
	return `${(prob * 100).toFixed(1)}%`;
}

// —— 交互 ——
function selectPrompt(index: number) {
	activeIndex.value = index;
	outputTokens.value = [];
}

function applyTemperaturePreset(value: number) {
	temperature.value = value;
}

/**
 * 按当前分布加权随机抽一个 token。
 * 教学演示、非安全场景，用 Math.random 即可（不涉及密码学需求）。
 */
function sampleOnce() {
	const pool = keptRows.value;
	if (pool.length === 0) return;
	const r = Math.random();
	let cum = 0;
	for (const row of pool) {
		cum += row.prob;
		if (r < cum) {
			outputTokens.value.push(row.token);
			return;
		}
	}
	// 浮点兜底：r 极端贴近 1 时走不到分支，直接取最后一名存活者
	outputTokens.value.push(pool[pool.length - 1].token);
}

function resetOutput() {
	outputTokens.value = [];
}

const sliderInputClass =
	'w-full cursor-pointer accent-violet-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400';
const presetIdleClass =
	'rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1 font-mono text-xs text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100';
const presetActiveClass =
	'rounded-md border border-violet-400/60 bg-violet-400/10 px-2.5 py-1 font-mono text-xs text-violet-200';
</script>

<template>
	<section
		class="sampling-root mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6"
		:aria-label="t.root"
	>
		<div class="flex flex-wrap items-baseline gap-x-4 gap-y-1">
			<h2 class="text-lg font-semibold text-zinc-100">{{ demo.title }}</h2>
			<span v-if="demo.note" class="text-xs text-zinc-500">{{ demo.note }}</span>
		</div>

		<!-- prompt 切换 -->
		<div class="mt-4 flex flex-wrap items-center gap-2" role="group" :aria-label="t.choosePrompt">
			<button
				v-for="(p, i) in demo.prompts"
				:key="p.text"
				type="button"
				:aria-pressed="i === activeIndex"
				:class="[
					'rounded-lg border px-3 py-1.5 font-mono text-sm transition-colors',
					i === activeIndex
						? 'border-violet-400/60 bg-violet-400/10 text-violet-200'
						: 'border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100'
				]"
				@click="selectPrompt(i)"
			>
				{{ p.text }}
			</button>
		</div>

		<div class="mt-6 grid gap-6 lg:grid-cols-5">
			<!-- 左列：参数控制 -->
			<div class="flex flex-col gap-5 lg:col-span-2">
				<div>
					<div class="flex items-baseline justify-between">
						<label for="sampling-temperature" class="text-sm font-medium text-zinc-300">
							{{ t.tempLabel }}
						</label>
						<span class="font-mono text-sm text-violet-300" aria-hidden="true">
							{{ temperature.toFixed(2) }}
						</span>
					</div>
					<input
						id="sampling-temperature"
						v-model.number="temperature"
						type="range"
						min="0.1"
						max="2"
						step="0.05"
						:aria-label="t.tempLabel"
						:class="sliderInputClass"
					/>
					<p class="mt-1 text-xs text-zinc-500">{{ t.tempHint }}</p>
				</div>

				<div>
					<div class="flex items-baseline justify-between">
						<label for="sampling-top-k" class="text-sm font-medium text-zinc-300">{{ t.topKLabel }}</label>
						<span class="font-mono text-sm text-violet-300" aria-hidden="true">{{ topK }}</span>
					</div>
					<input
						id="sampling-top-k"
						v-model.number="topK"
						type="range"
						min="1"
						:max="maxTopK"
						step="1"
						:aria-label="t.topKLabel"
						:class="sliderInputClass"
					/>
					<p class="mt-1 text-xs text-zinc-500">{{ t.topKHint }}</p>
				</div>

				<div>
					<div class="flex items-baseline justify-between">
						<label for="sampling-top-p" class="text-sm font-medium text-zinc-300">{{ t.topPLabel }}</label>
						<span class="font-mono text-sm text-violet-300" aria-hidden="true">
							{{ topP.toFixed(2) }}
						</span>
					</div>
					<input
						id="sampling-top-p"
						v-model.number="topP"
						type="range"
						min="0.05"
						max="1"
						step="0.05"
						:aria-label="t.topPLabel"
						:class="sliderInputClass"
					/>
					<p class="mt-1 text-xs text-zinc-500">{{ t.topPHint }}</p>
				</div>

				<!-- 对照视角：温度预设 -->
				<div>
					<p class="text-xs font-semibold tracking-wide text-zinc-400 uppercase">{{ t.presetsHeading }}</p>
					<div class="mt-2 flex flex-wrap items-center gap-2" role="group" :aria-label="t.presetsGroup">
						<button
							type="button"
							:aria-label="t.presetLow"
							:class="temperature === 0.2 ? presetActiveClass : presetIdleClass"
							@click="applyTemperaturePreset(0.2)"
						>
							{{ t.presetLowText }}
						</button>
						<button
							type="button"
							:aria-label="t.presetMid"
							:class="temperature === 1.0 ? presetActiveClass : presetIdleClass"
							@click="applyTemperaturePreset(1.0)"
						>
							{{ t.presetMidText }}
						</button>
						<button
							type="button"
							:aria-label="t.presetHigh"
							:class="temperature === 2.0 ? presetActiveClass : presetIdleClass"
							@click="applyTemperaturePreset(2.0)"
						>
							{{ t.presetHighText }}
						</button>
					</div>
				</div>

				<!-- 采样动作 -->
				<div class="mt-auto flex flex-wrap items-center gap-3" role="group" :aria-label="t.controlsGroup">
					<button
						type="button"
						:aria-label="t.sampleAria"
						class="rounded-md bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
						@click="sampleOnce"
					>
						{{ t.sample }}
					</button>
					<button
						type="button"
						:aria-label="t.resetAria"
						class="rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-200 transition-colors hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-300"
						@click="resetOutput"
					>
						{{ t.reset }}
					</button>
				</div>
			</div>

			<!-- 右列：生成输出 -->
			<div class="lg:col-span-3">
				<div class="flex h-full min-h-48 flex-col rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
					<div class="flex items-center justify-between gap-2">
						<h3 class="text-xs font-semibold tracking-wide text-zinc-400 uppercase">{{ t.outputHeading }}</h3>
						<span class="font-mono text-xs text-zinc-500">{{ t.sampled(outputTokens.length) }}</span>
					</div>
					<p
						class="mt-3 max-h-48 flex-1 overflow-y-auto font-mono text-sm leading-relaxed whitespace-pre-wrap break-words text-zinc-100"
						aria-live="polite"
						:aria-label="t.outputAria"
					>
						<span class="text-zinc-500">{{ activePrompt?.text }}</span><template
							v-for="(token, i) in outputTokens"
							:key="`${i}-${token}`"
						><span
							:class="i === outputTokens.length - 1 ? 'text-violet-300' : 'text-zinc-100'"
						>{{ token }}</span></template><span
							class="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-violet-400 align-middle"
							aria-hidden="true"
						></span>
					</p>
				</div>
			</div>
		</div>

		<!-- 分布条形图 -->
		<div class="mt-6">
			<div class="flex flex-wrap items-baseline justify-between gap-2">
				<h3 class="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
					{{ t.chartHeading }}
				</h3>
				<span class="font-mono text-xs text-zinc-500" aria-hidden="true">
					T={{ temperature.toFixed(2) }} · top-k={{ topK }} · top-p={{ topP.toFixed(2) }}
				</span>
			</div>
			<div class="mt-3 flex flex-col gap-2">
				<div v-for="row in rows" :key="row.token" class="flex items-center gap-3">
					<span
						:class="[
							'w-20 shrink-0 truncate font-mono text-sm whitespace-pre',
							row.isTop ? 'text-violet-300' : row.kept ? 'text-zinc-200' : 'text-zinc-600'
						]"
					>
						{{ row.token }}
					</span>
					<div
						class="h-6 flex-1 overflow-hidden rounded-md bg-zinc-800/70"
						role="meter"
						:aria-valuenow="row.kept ? Math.round(row.prob * 100) : 0"
						aria-valuemin="0"
						aria-valuemax="100"
						:aria-label="
							row.kept
								? t.meterProb(row.token, percentLabel(row.prob))
								: t.meterCut(row.token, row.cutBy)
						"
					>
						<div
							v-if="row.kept"
							class="h-full rounded-md transition-all duration-300 ease-out"
							:class="row.isTop ? 'bg-violet-400' : 'bg-zinc-500'"
							:style="{ width: `${row.prob * 100}%` }"
						></div>
					</div>
					<span
						:class="[
							'w-28 shrink-0 text-right font-mono text-xs whitespace-nowrap',
							row.isTop ? 'text-violet-300' : row.kept ? 'text-zinc-300' : 'text-zinc-600'
						]"
					>
						{{ row.kept ? percentLabel(row.prob) : t.truncated(row.cutBy) }}
					</span>
				</div>
			</div>
			<p class="mt-3 text-xs text-zinc-500">{{ t.legend }}</p>
		</div>
	</section>
</template>

<style scoped>
@media (prefers-reduced-motion: reduce) {
	.sampling-root,
	.sampling-root * {
		transition: none !important;
		animation: none !important;
	}
}
</style>
