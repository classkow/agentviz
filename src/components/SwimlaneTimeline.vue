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
		controls: '播放控制'
	},
	en: {
		play: 'Play',
		pause: 'Pause',
		stepForward: 'Step forward',
		stepBack: 'Step back',
		reset: 'Reset',
		root: 'Swim lane timeline',
		progress: 'Playback progress',
		controls: 'Playback controls'
	}
} as const;
const t = computed(() => (props.ui === 'en' ? UI_COPY.en : UI_COPY.zh));

const STEP_MS = 1200;

const rootEl = ref<HTMLElement | null>(null);
const currentIndex = ref(-1);
const isPlaying = ref(false);
const reducedMotion = ref(false);

let timer: ReturnType<typeof setInterval> | null = null;
let motionQuery: MediaQueryList | null = null;
let onMotionChange: ((event: MediaQueryListEvent) => void) | null = null;

const total = computed(() => props.demo.events.length);
const atStart = computed(() => currentIndex.value <= -1);
const atEnd = computed(() => currentIndex.value >= total.value - 1);

const gridStyle = computed(() => ({
	gridTemplateColumns: `repeat(${Math.max(props.demo.lanes.length, 1)}, minmax(0, 1fr))`
}));

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
	return reducedMotion.value || index <= currentIndex.value;
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

function jumpTo(index: number) {
	pause();
	currentIndex.value = index;
	rootEl.value?.focus();
}

onMounted(() => {
	motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
	reducedMotion.value = motionQuery.matches;
	onMotionChange = (event) => {
		reducedMotion.value = event.matches;
	};
	motionQuery.addEventListener('change', onMotionChange);
});

onBeforeUnmount(() => {
	stopTimer();
	if (motionQuery && onMotionChange) {
		motionQuery.removeEventListener('change', onMotionChange);
	}
});

const buttonClass =
	'rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40';
</script>

<template>
	<section
		ref="rootEl"
		class="swimlane-root mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
		tabindex="0"
		:aria-label="t.root"
		@keydown.left.prevent="stepBack"
		@keydown.right.prevent="stepForward"
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

		<div class="relative mt-6">
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
					'relative grid cursor-pointer items-center py-3 transition-opacity duration-300',
					isRevealed(index) ? 'opacity-100' : 'opacity-30'
				]"
				:style="gridStyle"
				:aria-current="isCurrent(index) ? 'step' : undefined"
				@click="jumpTo(index)"
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
	</section>
</template>

<style scoped>
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
