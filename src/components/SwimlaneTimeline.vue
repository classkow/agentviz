<script lang="ts">
export interface TimelineLane {
	id: string;
	label: string;
	color: 'sky' | 'cyan' | 'emerald' | 'violet' | 'amber' | 'rose';
}

export interface TimelineActionEvent {
	id: string;
	type: 'action';
	lane: string;
	label: string;
	detail?: string;
}

export interface TimelineMessageEvent {
	id: string;
	type: 'message';
	from: string;
	to: string;
	label: string;
	detail?: string;
}

export type TimelineEvent = TimelineActionEvent | TimelineMessageEvent;

export interface TimelineDemo {
	title: string;
	lanes: TimelineLane[];
	events: TimelineEvent[];
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const props = defineProps<{ demo: TimelineDemo; /** UI copy language for labels and aria-labels; 'zh' keeps the original rendering. */ ui?: 'zh' | 'en' }>();

// UI copy dictionary: 'zh' (default) keeps the original strings; 'en' swaps
// user-visible labels and aria-labels. No logic or structural changes.
const UI_COPY = {
	zh: {
		play: '播放',
		pause: '暂停',
		stepForward: '单步前进',
		stepBack: '单步后退',
		reset: '重置',
		root: '泳道时间轴',
		progress: '播放进度',
		controls: '播放控制',
		scrollRegion: '泳道图横向滚动区',
		swipeHint: '← 左右滑动查看完整图',
		hint: '点播放逐步回放，或点任意事件行查看'
	},
	en: {
		play: 'Play',
		pause: 'Pause',
		stepForward: 'Step forward',
		stepBack: 'Step back',
		reset: 'Reset',
		root: 'Swim lane timeline',
		progress: 'Playback progress',
		controls: 'Playback controls',
		scrollRegion: 'Swim lane chart, horizontally scrollable',
		swipeHint: 'Swipe horizontally to see all lanes',
		hint: 'Press play to step through, or click any event row to inspect it'
	}
} as const;
const t = computed(() => (props.ui === 'en' ? UI_COPY.en : UI_COPY.zh));

const STEP_MS = 1200;

const rootEl = ref<HTMLElement | null>(null);
const scrollEl = ref<HTMLElement | null>(null);
// 只有真的滚得动，才挂边缘渐隐与滑动提示——不溢出时它们是噪音。
const isScrollable = ref(false);
const currentIndex = ref(-1);
const isPlaying = ref(false);
const reducedMotion = ref(false);

function measureScroll() {
	const el = scrollEl.value;
	if (el) isScrollable.value = el.scrollWidth - el.clientWidth > 4;
}

// 聚焦在滚动容器上时，左右键翻一屏泳道：Chromium 不会把方向键的默认滚动
// 落到这个 overflow 容器上（它滚的是文档），所以横向滚动得自己发。
function scrollLanes(direction: number) {
	const el = scrollEl.value;
	if (!el) return;
	el.scrollBy({
		left: direction * Math.max(el.clientWidth * 0.6, 96),
		behavior: reducedMotion.value ? 'auto' : 'smooth'
	});
}

let timer: ReturnType<typeof setInterval> | null = null;
let motionQuery: MediaQueryList | null = null;
let onMotionChange: ((event: MediaQueryListEvent) => void) | null = null;

const total = computed(() => props.demo.events.length);
const atStart = computed(() => currentIndex.value <= -1);
const atEnd = computed(() => currentIndex.value >= total.value - 1);

const gridStyle = computed(() => ({
	gridTemplateColumns: `repeat(${Math.max(props.demo.lanes.length, 1)}, minmax(0, 1fr))`
}));

// Pin the swimlane stage to a width that fits every lane label without
// wrapping; on narrow viewports the outer overflow-x-auto container lets
// the user scroll horizontally instead of crushing the columns.
const swimlaneMinWidth = computed(
	() => `${Math.max(props.demo.lanes.length, 1) * 9}rem`
);

const laneIndexMap = computed(() => {
	const map = new Map<string, number>();
	props.demo.lanes.forEach((lane, index) => map.set(lane.id, index));
	return map;
});

interface LanePalette {
	dot: string;
	label: string;
	block: string;
	text: string;
}

// Full literal class names only — the Tailwind v4 scanner must see every class.
const PALETTES: Record<string, LanePalette> = {
	sky: {
		dot: 'bg-sky-400',
		label: 'text-sky-300',
		block: 'border-sky-400/60 bg-sky-400/10 text-sky-100',
		text: 'text-sky-400'
	},
	cyan: {
		dot: 'bg-cyan-400',
		label: 'text-cyan-300',
		block: 'border-cyan-400/60 bg-cyan-400/10 text-cyan-100',
		text: 'text-cyan-400'
	},
	emerald: {
		dot: 'bg-emerald-400',
		label: 'text-emerald-300',
		block: 'border-emerald-400/60 bg-emerald-400/10 text-emerald-100',
		text: 'text-emerald-400'
	},
	violet: {
		dot: 'bg-violet-400',
		label: 'text-violet-300',
		block: 'border-violet-400/60 bg-violet-400/10 text-violet-100',
		text: 'text-violet-400'
	},
	amber: {
		dot: 'bg-amber-400',
		label: 'text-amber-300',
		block: 'border-amber-400/60 bg-amber-400/10 text-amber-100',
		text: 'text-amber-400'
	},
	rose: {
		dot: 'bg-rose-400',
		label: 'text-rose-300',
		block: 'border-rose-400/60 bg-rose-400/10 text-rose-100',
		text: 'text-rose-400'
	}
};

const FALLBACK_PALETTE: LanePalette = {
	dot: 'bg-zinc-400',
	label: 'text-zinc-300',
	block: 'border-zinc-500/60 bg-zinc-500/10 text-zinc-100',
	text: 'text-zinc-400'
};

function palette(color: string): LanePalette {
	return PALETTES[color] ?? FALLBACK_PALETTE;
}

function laneIndex(id: string): number {
	return laneIndexMap.value.get(id) ?? 0;
}

function laneColor(id: string): string {
	return props.demo.lanes.find((lane) => lane.id === id)?.color ?? '';
}

function eventColor(event: TimelineEvent): string {
	return event.type === 'action' ? laneColor(event.lane) : laneColor(event.from);
}

function messageSpan(event: TimelineMessageEvent): { column: string; forward: boolean } {
	const from = laneIndex(event.from);
	const to = laneIndex(event.to);
	const start = Math.min(from, to);
	const end = Math.max(from, to);
	return { column: `${start + 1} / ${end + 2}`, forward: to >= from };
}

function isRevealed(index: number): boolean {
	// 未播放态整轴可读：全灰的首屏看起来像坏了。只有真正开始回放/跳步后，
	// 尚未抵达的事件才渐隐。
	return reducedMotion.value || atStart.value || index <= currentIndex.value;
}

function isCurrent(index: number): boolean {
	return !reducedMotion.value && index === currentIndex.value;
}

function detailVisible(index: number): boolean {
	return reducedMotion.value || index === currentIndex.value;
}

function stopTimer() {
	if (timer !== null) {
		clearInterval(timer);
		timer = null;
	}
}

function play() {
	if (isPlaying.value) return;
	if (atEnd.value) currentIndex.value = -1;
	isPlaying.value = true;
	stopTimer();
	timer = setInterval(() => {
		if (atEnd.value) {
			pause();
			return;
		}
		currentIndex.value += 1;
	}, STEP_MS);
}

function pause() {
	stopTimer();
	isPlaying.value = false;
}

function stepForward() {
	pause();
	if (!atEnd.value) currentIndex.value += 1;
}

function stepBack() {
	pause();
	if (!atStart.value) currentIndex.value -= 1;
}

function reset() {
	pause();
	currentIndex.value = -1;
}

function togglePlay() {
	if (isPlaying.value) pause();
	else play();
}

function jumpTo(index: number, preventScroll = false) {
	pause();
	currentIndex.value = index;
	rootEl.value?.focus(preventScroll ? { preventScroll: true } : undefined);
}

// 正文里的 `#demo-step-N` 锚点直接点跳到第 N 步（1 计），越界取边界；
// 不匹配该模式的 hash 交还给浏览器原生行为，组件不做任何事。
const DEMO_STEP_HASH = /^#demo-step-(\d+)$/;

function applyHashStep() {
	const match = DEMO_STEP_HASH.exec(window.location.hash);
	if (!match || total.value === 0) return;
	const index = Math.min(Math.max(Number(match[1]) - 1, 0), total.value - 1);
	jumpTo(index, true);
	rootEl.value?.scrollIntoView({
		behavior: reducedMotion.value ? 'auto' : 'smooth',
		block: 'start'
	});
}

onMounted(() => {
	motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
	reducedMotion.value = motionQuery.matches;
	onMotionChange = (event) => {
		reducedMotion.value = event.matches;
	};
	motionQuery.addEventListener('change', onMotionChange);
	window.addEventListener('hashchange', applyHashStep);
	applyHashStep();
	measureScroll();
	window.addEventListener('resize', measureScroll);
});

onBeforeUnmount(() => {
	stopTimer();
	window.removeEventListener('hashchange', applyHashStep);
	window.removeEventListener('resize', measureScroll);
	if (motionQuery && onMotionChange) {
		motionQuery.removeEventListener('change', onMotionChange);
	}
});

const buttonClass =
	'min-h-[44px] rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 transition-colors hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 disabled:cursor-not-allowed disabled:opacity-40';
</script>

<template>
	<!-- 容器级 space 与事件行级 space 按 target 区分：事件行在 focus
	     时拦截到自己，S3-1 的 keydown.space 命中事件行而冒泡到容器；
	     反之根容器 focus 时只有容器级 handler 触发，事件行未参与。
	     此设计让「空格」在两处都给出合理 UX：根容器 = 播放/暂停切换，
	     事件行 = 跳到该行（同时启动播放以观察上下文），不需要 .stop。 -->
	<section
		ref="rootEl"
		class="swimlane-root mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
		tabindex="0"
		:aria-label="t.root"
		@keydown.left.prevent="stepBack"
		@keydown.right.prevent="stepForward"
		@keydown.space.prevent="togglePlay"
	>
		<div class="flex flex-wrap items-center gap-4">
			<h2 class="text-lg font-semibold text-zinc-100">{{ demo.title }}</h2>
			<span
				class="ml-auto rounded-full bg-zinc-800 px-3 py-1 font-mono text-xs text-zinc-300"
				:aria-label="t.progress"
			>
				{{ Math.max(currentIndex + 1, 0) }}/{{ total }}
			</span>
			<div class="flex flex-wrap items-center gap-2" role="group" :aria-label="t.controls">
				<button
					type="button"
					:aria-label="t.play"
					:disabled="isPlaying"
					:class="buttonClass"
					@click="play"
				>
					{{ t.play }}
				</button>
				<button
					type="button"
					:aria-label="t.pause"
					:disabled="!isPlaying"
					:class="buttonClass"
					@click="pause"
				>
					{{ t.pause }}
				</button>
				<button
					type="button"
					:aria-label="t.stepForward"
					:disabled="atEnd"
					:class="buttonClass"
					@click="stepForward"
				>
					{{ t.stepForward }}
				</button>
				<button
					type="button"
					:aria-label="t.stepBack"
					:disabled="atStart"
					:class="buttonClass"
					@click="stepBack"
				>
					{{ t.stepBack }}
				</button>
				<button
					type="button"
					:aria-label="t.reset"
					:disabled="atStart && !isPlaying"
					:class="buttonClass"
					@click="reset"
				>
					{{ t.reset }}
				</button>
			</div>
		</div>

		<p v-if="atStart" class="mt-3 text-xs text-zinc-400">{{ t.hint }}</p>

		<p
			v-if="isScrollable"
			class="swimlane-swipe-hint mt-3 text-xs text-zinc-400 md:hidden"
		>
			{{ t.swipeHint }}
		</p>

		<!-- 窄屏时泳道会溢出：容器自身可聚焦、可用方向键滚动。左/右按键 .stop
		     在这里截住，交给浏览器原生横向滚动，不再冒泡到根容器的单步前进/后退。 -->
		<div
			ref="scrollEl"
			class="swimlane-scroll overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
			:class="{ 'is-scrollable': isScrollable }"
			tabindex="0"
			role="region"
			:aria-label="t.scrollRegion"
			@keydown.left.prevent.stop="scrollLanes(-1)"
			@keydown.right.prevent.stop="scrollLanes(1)"
		>
			<div class="relative mt-6" :style="{ minWidth: swimlaneMinWidth }">
			<div
				class="pointer-events-none absolute inset-0 grid"
				:style="gridStyle"
				aria-hidden="true"
			>
				<div v-for="lane in demo.lanes" :key="lane.id" class="relative">
					<div class="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-zinc-800"></div>
				</div>
			</div>

			<div class="relative grid pb-4" :style="gridStyle">
				<div
					v-for="lane in demo.lanes"
					:key="lane.id"
					class="flex items-center justify-center gap-2"
				>
					<span :class="['h-2.5 w-2.5 rounded-full', palette(lane.color).dot]"></span>
					<span :class="['text-sm font-medium', palette(lane.color).label]">
						{{ lane.label }}
					</span>
				</div>
			</div>

			<div
				v-for="(event, index) in demo.events"
				:key="event.id"
				:class="[
					'relative grid cursor-pointer items-center py-3 outline-none transition-opacity duration-300 focus-visible:ring-2 focus-visible:ring-sky-500',
					isRevealed(index) ? 'opacity-100' : 'opacity-30'
				]"
				:style="gridStyle"
				:aria-current="isCurrent(index) ? 'step' : undefined"
				role="button"
				:tabindex="0"
				:aria-label="event.label"
				@click="jumpTo(index)"
				@keydown.enter.prevent="jumpTo(index)"
				@keydown.space.prevent="jumpTo(index)"
			>
				<template v-if="event.type === 'action'">
					<div :style="{ gridColumn: String(laneIndex(event.lane) + 1) }" class="flex justify-center px-2">
						<div
							:class="[
								'w-full max-w-56 rounded-lg border px-3 py-2 text-center text-sm',
								palette(eventColor(event)).block,
								isCurrent(index) ? 'ring-2 ring-white/70' : ''
							]"
						>
							{{ event.label }}
						</div>
					</div>
				</template>

				<template v-else>
					<div
						:style="{ gridColumn: messageSpan(event).column }"
						:class="['flex flex-col gap-1 px-3', palette(eventColor(event)).text]"
					>
						<span
							:class="[
								'truncate text-center text-xs font-medium',
								isCurrent(index) ? 'text-zinc-100' : ''
							]"
						>
							{{ event.label }}
						</span>
						<div
							:class="[
								'flex items-center',
								messageSpan(event).forward ? '' : 'flex-row-reverse'
							]"
						>
							<div
								:class="[
									'h-0.5 flex-1 bg-current',
									isCurrent(index) && !reducedMotion
										? messageSpan(event).forward
											? 'msg-draw origin-left'
											: 'msg-draw origin-right'
										: ''
								]"
							></div>
							<div
								:class="[
									'h-2.5 w-2.5 rotate-45 border-current',
									messageSpan(event).forward
										? '-ml-0.5 border-r-2 border-t-2'
										: '-mr-0.5 border-b-2 border-l-2'
								]"
							></div>
						</div>
					</div>
				</template>

				<div
					v-if="detailVisible(index) && event.detail"
					class="col-span-full mt-2 flex justify-center px-2"
				>
					<p class="rounded-md bg-zinc-800/80 px-3 py-1.5 text-center text-xs leading-relaxed text-zinc-300">
						{{ event.detail }}
					</p>
				</div>
			</div>
			</div>
		</div>
	</section>
</template>

<style scoped>
/* 溢出时左右边缘渐隐，暗示还有内容在视野外（不溢出时不挂，见 isScrollable）。 */
.swimlane-scroll.is-scrollable {
	-webkit-mask-image: linear-gradient(
		to right,
		transparent 0,
		#000 1.5rem,
		#000 calc(100% - 1.5rem),
		transparent 100%
	);
	mask-image: linear-gradient(
		to right,
		transparent 0,
		#000 1.5rem,
		#000 calc(100% - 1.5rem),
		transparent 100%
	);
}

@keyframes msg-draw {
	from {
		transform: scaleX(0);
	}
	to {
		transform: scaleX(1);
	}
}

.msg-draw {
	animation: msg-draw 0.6s ease-out both;
}

@media (prefers-reduced-motion: reduce) {
	.swimlane-root,
	.swimlane-root * {
		transition: none !important;
		animation: none !important;
	}
}
</style>
