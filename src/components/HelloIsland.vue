<script setup lang="ts">
import { ref } from 'vue';

const clicks = ref(0);
</script>

<template>
	<div class="mt-8 flex flex-col items-center gap-3">
		<p class="text-sm text-slate-500">
			The button below is a Vue 3 island, hydrated on demand by Astro.
		</p>
		<button
			type="button"
			class="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-500"
			@click="clicks++"
		>
			Hello from Vue · clicks: {{ clicks }}
		</button>
	</div>
</template>
