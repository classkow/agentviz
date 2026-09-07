/**
 * E01「一次请求的旅程」的可运行版本：打包请求体 → stream: true → 逐帧解析 SSE
 * → 打印增量内容。请求体与课内代码块是同一份 payload（model 由环境变量给）。
 *
 *   export LLM_BASE_URL=… LLM_MODEL=… LLM_API_KEY=…
 *   node examples/e01-request-journey.mjs
 *
 * 教学示意，非生产代码。
 */
import { chatCompletion, readConfig } from './_llm.mjs';

const config = readConfig();

const payload = {
	messages: [
		{ role: 'system', content: '你是天气助手' },
		{ role: 'user', content: '明天北京适合野餐吗？' }
	],
	stream: true,
	// 带上这个开关，兼容端点才会在 [DONE] 之前单发一条 usage 帧（E01 正文的坑位）。
	stream_options: { include_usage: true },
	temperature: 1,
	max_tokens: 1024
};

console.log('→ POST /chat/completions（stream: true）');
const result = await chatCompletion(config, payload);

if (result.kind === 'json') {
	// 端点没按 stream 参数返回事件流时，退化成一次性 JSON。
	console.log(result.data.choices?.[0]?.message?.content ?? '');
	console.log('\n← 非流式响应，无 SSE 帧');
} else {
	console.log(`← 共 ${result.frameCount} 个增量帧，末尾收到 data: [DONE] 哨兵`);
}

if (result.usage) {
	console.log(
		`usage：prompt ${result.usage.prompt_tokens} · completion ${result.usage.completion_tokens} · 合计 ${result.usage.total_tokens}`
	);
} else {
	console.log('usage：该端点未在流尾附带 usage 统计');
}
