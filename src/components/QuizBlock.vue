<script lang="ts">
/**
 * 课末自测题的数据契约，全站统一：
 * zh 放 src/content/quizzes/<slug>.json，en 放 src/content/quizzes/en/<slug>.json。
 * `answer` 是 `options` 中正确项的下标；`explanation` 一句话指回正文小节。
 */
export interface QuizQuestion {
	question: string;
	options: string[];
	answer: number;
	explanation: string;
}

export interface QuizData {
	questions: QuizQuestion[];
}
</script>

<script setup lang="ts">
import { computed, ref } from 'vue';

const props = defineProps<{
	quiz: QuizData;
	/** UI copy language for labels and aria-labels; 'zh' keeps the original rendering. */
	ui?: 'zh' | 'en';
}>();

const UI_COPY = {
	zh: {
		heading: '课末自测',
		hint: '选出你认为正确的选项，再点「检查答案」。',
		check: '检查答案',
		retry: '重做',
		correct: '✓ 答对了',
		incorrect: '✗ 答错了',
		correctMark: '正确答案',
		explanation: '解析：',
		score: (right: number, total: number) => `自测得分 ${right}/${total}`,
		questionLabel: (n: number) => `第 ${n} 题`,
		optionLabel: (q: number, o: number) => `第 ${q} 题第 ${o + 1} 个选项`
	},
	en: {
		heading: 'Lesson quiz',
		hint: 'Pick the option you think is right, then check your answer.',
		check: 'Check answer',
		retry: 'Try again',
		correct: '✓ Correct',
		incorrect: '✗ Not quite',
		correctMark: 'Correct answer',
		explanation: 'Explanation: ',
		score: (right: number, total: number) => `Quiz score ${right}/${total}`,
		questionLabel: (n: number) => `Question ${n}`,
		optionLabel: (q: number, o: number) => `Question ${q}, option ${o + 1}`
	}
} as const;
const t = computed(() => (props.ui === 'en' ? UI_COPY.en : UI_COPY.zh));

const questions = computed(() => props.quiz.questions ?? []);

/** picked[i] = 该题选中的下标，-1 表示未选；checked[i] = 该题是否已判分。 */
const picked = ref<number[]>([]);
const checked = ref<boolean[]>([]);

function pickedAt(i: number): number {
	return picked.value[i] ?? -1;
}

function isChecked(i: number): boolean {
	return checked.value[i] === true;
}

function pick(i: number, option: number) {
	if (isChecked(i)) return;
	const next = [...picked.value];
	next[i] = option;
	picked.value = next;
}

function check(i: number) {
	if (pickedAt(i) < 0 || isChecked(i)) return;
	const next = [...checked.value];
	next[i] = true;
	checked.value = next;
}

function retry(i: number) {
	const nextPicked = [...picked.value];
	const nextChecked = [...checked.value];
	nextPicked[i] = -1;
	nextChecked[i] = false;
	picked.value = nextPicked;
	checked.value = nextChecked;
}

const allChecked = computed(() =>
	questions.value.length > 0 && questions.value.every((_, i) => isChecked(i))
);

const rightCount = computed(() =>
	questions.value.reduce((sum, q, i) => sum + (isChecked(i) && pickedAt(i) === q.answer ? 1 : 0), 0)
);

function isRight(i: number): boolean {
	return isChecked(i) && pickedAt(i) === questions.value[i].answer;
}

// 全字面量类名：Tailwind v4 扫描器看不见运行时拼接出来的 class。
const optionIdleClass =
	'flex min-h-[44px] cursor-pointer items-start gap-3 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100';
const optionPickedClass =
	'flex min-h-[44px] cursor-pointer items-start gap-3 rounded-lg border border-sky-400/60 bg-sky-400/10 px-3 py-2 text-sm text-sky-100 transition-colors';
const optionRevealClass =
	'flex min-h-[44px] items-start gap-3 rounded-lg border border-emerald-400/60 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100';
const optionWrongClass =
	'flex min-h-[44px] items-start gap-3 rounded-lg border border-rose-400/60 bg-rose-400/10 px-3 py-2 text-sm text-rose-100';

function optionClass(i: number, o: number): string {
	if (isChecked(i)) {
		if (o === questions.value[i].answer) return optionRevealClass;
		if (o === pickedAt(i)) return optionWrongClass;
		return optionIdleClass;
	}
	return pickedAt(i) === o ? optionPickedClass : optionIdleClass;
}

const checkButtonClass =
	'min-h-[44px] rounded-md border border-sky-400/60 bg-sky-400/10 px-3 py-2 text-sm text-sky-100 transition-colors hover:bg-sky-400/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 disabled:cursor-not-allowed disabled:opacity-40';
const retryButtonClass =
	'min-h-[44px] rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 transition-colors hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400';

/** 同一个按钮节点承担「判分 / 重做」两个动作：换成新节点会把键盘焦点丢掉。 */
function advance(i: number) {
	if (isChecked(i)) retry(i);
	else check(i);
}

function actionClass(i: number): string {
	return isChecked(i) ? retryButtonClass : checkButtonClass;
}

function actionLabel(i: number): string {
	return isChecked(i) ? t.value.retry : t.value.check;
}
</script>

<template>
	<section
		v-if="questions.length"
		class="quiz-root mt-10 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6"
		:aria-label="t.heading"
	>
		<h2 class="text-lg font-semibold text-zinc-100">{{ t.heading }}</h2>
		<p class="mt-2 text-xs text-zinc-400">{{ t.hint }}</p>

		<div class="mt-6 flex flex-col gap-8">
			<fieldset
				v-for="(q, i) in questions"
				:key="i"
				class="border-0 p-0"
				:data-quiz-question="i"
			>
				<legend class="text-sm font-medium text-zinc-100">
					<span class="mr-2 font-mono text-xs text-zinc-500">{{ t.questionLabel(i + 1) }}</span>
					{{ q.question }}
				</legend>

				<div class="mt-3 flex flex-col gap-2">
					<label
						v-for="(opt, o) in q.options"
						:key="o"
						:class="optionClass(i, o)"
						:data-quiz-option="o"
					>
						<input
							type="radio"
							:name="`quiz-${i}`"
							:value="o"
							class="h-4 w-4 shrink-0 accent-sky-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
							:checked="pickedAt(i) === o"
							:disabled="isChecked(i)"
							:aria-label="t.optionLabel(i + 1, o)"
							@change="pick(i, o)"
						/>
						<span>{{ opt }}</span>
						<span
							v-if="isChecked(i) && o === q.answer"
							class="ml-auto shrink-0 rounded-full border border-emerald-400/60 px-2 py-0.5 text-xs text-emerald-200"
						>
							{{ t.correctMark }}
						</span>
					</label>
				</div>

				<div class="mt-3 flex flex-wrap items-center gap-3">
					<button
						type="button"
						class="quiz-check"
						:class="actionClass(i)"
						:data-quiz-action="isChecked(i) ? 'retry' : 'check'"
						:disabled="!isChecked(i) && pickedAt(i) < 0"
						@click="advance(i)"
					>
						{{ actionLabel(i) }}
					</button>
					<p
						v-if="isChecked(i)"
						:class="[
							'text-sm font-medium',
							isRight(i) ? 'text-emerald-300' : 'text-rose-300'
						]"
					>
						{{ isRight(i) ? t.correct : t.incorrect }}
					</p>
				</div>

				<p
					v-if="isChecked(i)"
					class="quiz-explanation mt-3 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm leading-relaxed text-zinc-300"
					role="status"
				>
					<span class="font-medium text-zinc-400">{{ t.explanation }}</span>{{ q.explanation }}
				</p>
			</fieldset>
		</div>

		<p
			v-if="allChecked"
			class="quiz-score mt-6 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-center font-mono text-sm text-sky-300"
			role="status"
		>
			{{ t.score(rightCount, questions.length) }}
		</p>
	</section>
</template>

<style scoped>
@media (prefers-reduced-motion: reduce) {
	.quiz-root,
	.quiz-root * {
		transition: none !important;
		animation: none !important;
	}
}
</style>
