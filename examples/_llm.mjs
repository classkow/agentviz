/**
 * 五个 examples/*.mjs 共用的最小客户端：读环境变量、发一次 OpenAI 兼容请求。
 * 教学示意，非生产代码——没有重试、没有超时、没有流中断处理，也没有密钥管理。
 */

const USAGE = [
	'用法：',
	'  export LLM_BASE_URL="https://<你的兼容端点>/v1"',
	'  export LLM_MODEL="<模型名>"',
	'  export LLM_API_KEY="<密钥>"',
	'  node examples/<slug>.mjs',
	'',
	'三个变量都只从环境读取，脚本里不含任何默认端点或密钥。'
].join('\n');

/**
 * 读取端点三要素。缺任何一个都直接打印说明并以 1 退出，
 * 而不是让 fetch 抛一个看不懂的连接错误。
 */
export function readConfig() {
	const missing = ['LLM_BASE_URL', 'LLM_MODEL', 'LLM_API_KEY'].filter((k) => !process.env[k]);
	if (missing.length > 0) {
		console.error(`缺少环境变量：${missing.join('、')}\n`);
		console.error(USAGE);
		process.exit(1);
	}
	return {
		baseUrl: process.env.LLM_BASE_URL.replace(/\/$/, ''),
		model: process.env.LLM_MODEL,
		apiKey: process.env.LLM_API_KEY
	};
}

/**
 * 一次 chat/completions 调用。payload 由各 example 原样给出，
 * 好让「课上的请求体」和「实际发出去的东西」逐字对得上。
 */
export async function chatCompletion(config, payload) {
	const response = await fetch(`${config.baseUrl}/chat/completions`, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			authorization: `Bearer ${config.apiKey}`
		},
		body: JSON.stringify({ model: config.model, ...payload })
	});
	if (!response.ok) {
		const text = await response.text();
		throw new Error(`HTTP ${response.status}：${text.slice(0, 400)}`);
	}
	const ct = response.headers.get('content-type') ?? '';
	if (ct.includes('text/event-stream')) return streamResponse(response);
	return { kind: 'json', data: await response.json() };
}

/**
 * SSE 读取：字节块的到达边界不等于帧边界，先缓冲，遇空行才解析一帧，
 * 末尾的 `data: [DONE]` 是流终止哨兵——正是 E01 讲的那套形状。
 */
async function streamResponse(response) {
	const reader = response.body.getReader();
	const decoder = new TextDecoder('utf-8');
	let buffer = '';
	let content = '';
	let usage = null;
	const frames = [];

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });
		let boundary = buffer.indexOf('\n\n');
		while (boundary !== -1) {
			const frame = buffer.slice(0, boundary);
			buffer = buffer.slice(boundary + 2);
			boundary = buffer.indexOf('\n\n');
			for (const line of frame.split('\n')) {
				// 冒号开头的是心跳注释行，按规范忽略。
				if (!line.startsWith('data:')) continue;
				const data = line.slice(5).trim();
				if (data === '[DONE]') continue;
				const parsed = JSON.parse(data);
				const delta = parsed.choices?.[0]?.delta?.content ?? '';
				if (delta) {
					frames.push(delta);
					content += delta;
					process.stdout.write(delta);
				}
				if (parsed.usage) usage = parsed.usage;
			}
		}
	}
	if (frames.length > 0) process.stdout.write('\n');
	return { kind: 'stream', content, usage, frameCount: frames.length };
}
