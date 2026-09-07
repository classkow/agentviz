/**
 * P01「结构化提示」的可运行版本：把 [角色] / [任务] / [约束] / [输出格式] 四段
 * 结构化成 system 提示，塞进一封示例客户邮件，只要一个 JSON 对象回来。
 * 请求结构与课内那段模板逐字一致。
 *
 *   export LLM_BASE_URL=… LLM_MODEL=… LLM_API_KEY=…
 *   node examples/p01-structured-prompts.mjs
 *
 * 教学示意，非生产代码。
 */
import { chatCompletion, readConfig } from './_llm.mjs';

const config = readConfig();

const MAIL = `发件人：wanghai@brightmart.example
邮件日期：2026-03-04
主题：报表导出按钮点了没反应

王工你好，上周升级之后我们这边导出报表的按钮点了完全没反应，运维那边催得急，
麻烦这周五之前给看看。如果来不及，下周一上午前也行。—— 海哥`;

// 与正文代码块同构：四段定死，占位符只有 <mail>。
const SYSTEM_PROMPT = `[角色]
你是工单录入助手，只输出结构化结果，不写散文、不做解释。

[任务]
从下方 <mail> 区块里的客户邮件中抽取工单字段。

[约束]
- 取不到的字段填 null：宁可承认缺失，不要猜测或编造。
- 日期一律输出 YYYY-MM-DD；邮件里的相对说法按邮件日期换算。
- 只使用邮件中出现的信息，不引入外部知识。

[输出格式]
仅输出一个 JSON 对象，字段固定为 sender、deadline、priority、reply_by，
不输出 JSON 之外的任何字符。

<mail>
${MAIL}
</mail>`;

const result = await chatCompletion(config, {
	messages: [
		{ role: 'system', content: SYSTEM_PROMPT },
		{ role: 'user', content: '按上述格式抽取这封邮件。' }
	],
	temperature: 0,
	max_tokens: 300
});

const text =
	result.kind === 'json' ? (result.data.choices?.[0]?.message?.content ?? '') : result.content;
console.log('← 模型原始输出：');
console.log(text.trim());

// 约束里写了「只输出 JSON」，所以这里敢直接 parse；真实系统要按 P04 的说法兜住解析失败。
try {
	console.log('\n解析后的工单对象：');
	console.log(JSON.parse(text.replace(/^```json\s*|```$/gms, '').trim()));
} catch {
	console.log('\n（输出不是合法 JSON——正是 P01 那四条约束在替你挡的事故）');
}
