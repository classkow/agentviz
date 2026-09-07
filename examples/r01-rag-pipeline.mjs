/**
 * R01「RAG 全景流水线」的可运行版本，走的是在线查询这条通道：
 *   1 嵌入查询 → 与语料向量比余弦相似度，取 top-k
 *   2 把命中的段落连同元数据拼进 system 提示（开卷）
 *   3 以低 temperature 生成
 *
 * 语料只有五条硬编码的段落，嵌入用真实端点跑（模型名来自环境变量）。
 * 本课演示不含重排序（R04 再讲）。
 *
 *   export LLM_BASE_URL=… LLM_MODEL=… LLM_API_KEY=…
 *   export LLM_EMBED_MODEL="<嵌入模型名>"
 *   node examples/r01-rag-pipeline.mjs
 *
 * 教学示意，非生产代码：没有向量库、没有增量索引、没有鉴权与重试。
 */
import { chatCompletion, readConfig } from './_llm.mjs';

const config = readConfig();
const embedModel = process.env.LLM_EMBED_MODEL;
if (!embedModel) {
	console.error('缺少环境变量：LLM_EMBED_MODEL\n（R01 需要单独指定嵌入模型——建库与查询必须是同一个，见正文。）\n');
	console.error('  export LLM_EMBED_MODEL="<嵌入模型名>"');
	process.exit(1);
}

const CORPUS = [
	{ doc: '财务制度 v6', section: '回款', text: '第三季度回款政策：账期 60 天以内不计息，超期按日 0.05% 计违约金。' },
	{ doc: '财务制度 v6', section: '发票', text: '增值税专用发票在开票后 15 个工作日内寄出，支持电子发票即时下载。' },
	{ doc: '运营手册', section: '折扣', text: '季度返点按回款到账金额计算，未到账部分不进入返点池。' },
	{ doc: '法务备忘', section: '争议', text: '对账单争议需在 30 日内书面提出，逾期视为认可。' },
	{ doc: '产品 FAQ', section: '价格', text: '公开报价不含税费，含税价格以合同附件为准。' }
];

const QUERY = '第三季度的回款政策是什么？';

async function embed(texts) {
	const response = await fetch(`${config.baseUrl}/embeddings`, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			authorization: `Bearer ${config.apiKey}`
		},
		body: JSON.stringify({ model: embedModel, input: texts })
	});
	if (!response.ok) throw new Error(`嵌入请求 HTTP ${response.status}：${(await response.text()).slice(0, 300)}`);
	const data = await response.json();
	// 返回顺序与入参顺序一致，按 index 排序一次更稳妥。
	return data.data.sort((a, b) => a.index - b.index).map((item) => item.embedding);
}

function cosine(a, b) {
	let dot = 0;
	let na = 0;
	let nb = 0;
	for (let i = 0; i < Math.min(a.length, b.length); i++) {
		dot += a[i] * b[i];
		na += a[i] * a[i];
		nb += b[i] * b[i];
	}
	return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

console.log(`→ 嵌入查询：${QUERY}`);
const [queryVec, ...docVecs] = await embed([QUERY, ...CORPUS.map((chunk) => chunk.text)]);

const ranked = CORPUS.map((chunk, i) => ({ chunk, score: cosine(queryVec, docVecs[i]) })).sort(
	(a, b) => b.score - a.score
);
const topK = ranked.slice(0, 5);
console.log('← 召回（按嵌入相似度排序）：');
for (const hit of topK) {
	console.log(`   ${hit.score.toFixed(4)}  ${hit.chunk.doc} · ${hit.chunk.section}`);
}

const docs = topK.map((hit) => `[${hit.chunk.doc} / ${hit.chunk.section}] ${hit.chunk.text}`).join('\n');
const result = await chatCompletion(config, {
	messages: [
		{
			role: 'system',
			content: `仅依据以下资料回答，标不出来源就明说找不到\n<docs>\n${docs}\n</docs>`
		},
		{ role: 'user', content: QUERY }
	],
	temperature: 0.2,
	max_tokens: 400
});

const answer =
	result.kind === 'json' ? (result.data.choices?.[0]?.message?.content ?? '') : result.content;
console.log('\n← 开卷作答：');
console.log(answer);
