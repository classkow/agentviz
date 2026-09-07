/**
 * G02「成本工程」的可运行版本：同一个稳定前缀连发两次，把端点回报的
 * usage.prompt_tokens 换成账单，再按课内那套缓存口径折算一次。
 *
 * 口径与正文代码块一致：输入费率 ¥4/百万 token、命中部分按 0.1 折价、命中率 0.92、
 * 日请求 10 万次。前缀是四段稳定内容（system 提示 / 术语表 / 输出格式 / 知识库索引），
 * 缓存能不能命中，取决于它每次都逐字不变——所以别在这里加时间戳。
 *
 *   export LLM_BASE_URL=… LLM_MODEL=… LLM_API_KEY=…
 *   node examples/g02-cost-engineering.mjs
 *
 * 教学示意，非生产代码；费率为占位值，非任何厂商报价。
 */
import { chatCompletion, readConfig } from './_llm.mjs';

const config = readConfig();

const RATE_PER_MILLION = Number(process.env.LLM_RATE_PER_MILLION ?? 4); // 示例费率，非报价
const CACHE_HIT_RATIO = 0.1; // 命中部分按 1 折计费
const CACHE_HIT_RATE = 0.92;
const DAILY_REQUESTS = 100_000;

const STABLE_PREFIX = [
	'[system] 你是企业知识库助手，只根据给定资料回答，回答必须标注来源段落。',
	`[术语表] ${'回款：客户到账金额；账期：开票到到账的天数；返点：按回款计提的折扣；争议：对账单异议。'.repeat(18)}`,
	'[输出格式] 三段式：结论 / 依据段落编号 / 风险提示，不输出多余寒暄。',
	`[知识库索引] ${'财务制度 v6、运营手册、法务备忘、产品 FAQ、合同模板汇编、报销细则、开票指引。'.repeat(20)}`
].join('\n\n');

async function billOnce(tail) {
	const result = await chatCompletion(config, {
		messages: [
			{ role: 'system', content: STABLE_PREFIX },
			{ role: 'user', content: tail }
		],
		temperature: 0,
		max_tokens: 60
	});
	const data = result.kind === 'json' ? result.data : result.usage;
	const usage = data?.usage ?? {};
	return {
		prompt: usage.prompt_tokens ?? 0,
		// 端点没回 usage 就无从对账——这正是 E01 强调「只认 usage」的原因。
		answer: result.kind === 'json' ? (result.data.choices?.[0]?.message?.content ?? '') : result.content
	};
}

console.log('→ 第一次调用（缓存冷）');
const cold = await billOnce('第三季度的回款政策是什么？');
console.log(`   prompt_tokens = ${cold.prompt}`);
console.log('→ 第二次调用（同样的前缀，只有问题变了）');
const warm = await billOnce('发票多久寄出？');
console.log(`   prompt_tokens = ${warm.prompt}`);

const money = (value) => `¥${value.toFixed(6)}`;
const perRequest = (tokens) => (tokens * RATE_PER_MILLION) / 1_000_000;

console.log('\n单次账单（按端点回报的 prompt_tokens 与示例费率折算）：');
console.log(`   冷启动  ${cold.prompt} tokens → ${money(perRequest(cold.prompt))}`);
console.log(`   第二次  ${warm.prompt} tokens → ${money(perRequest(warm.prompt))}`);

const prefix = Math.max(cold.prompt, warm.prompt, 1);
const billedWithCache = prefix * CACHE_HIT_RATE * CACHE_HIT_RATIO + prefix * (1 - CACHE_HIT_RATE);
console.log(`\n按课内缓存口径折算这一份前缀（${prefix} tokens）：`);
console.log(
	`   不缓存  ${prefix} tokens → ${money(perRequest(prefix))}/次 · ${money(perRequest(prefix) * DAILY_REQUESTS)}/天`
);
console.log(
	`   命中 ${CACHE_HIT_RATE}：${prefix} × ${CACHE_HIT_RATE} × ${CACHE_HIT_RATIO} + ${prefix} × ${(1 - CACHE_HIT_RATE).toFixed(2)} = ${billedWithCache.toFixed(0)} tokens`
);
console.log(
	`   缓存后  ${billedWithCache.toFixed(0)} tokens → ${money(perRequest(billedWithCache))}/次 · ${money(perRequest(billedWithCache) * DAILY_REQUESTS)}/天`
);
console.log(
	`   月省（30 天）${money((perRequest(prefix) - perRequest(billedWithCache)) * DAILY_REQUESTS * 30)}，比例 ${((1 - billedWithCache / prefix) * 100).toFixed(0)}%`
);
console.log('\n（费率与命中率都是教学占位值，真实数字以你自己的账单回归为准。）');
