/**
 * T01「函数调用」的可运行版本：声明工具 → 模型回 tool_calls 申请 → 客户端自己执行
 * → 按 id 回填 tool_result → 再调一次拿自然语言答复。
 *
 * 课内代码块写的是 Anthropic 形状（input_schema / tool_use / tool_result），
 * 这里发的是 OpenAI 兼容形状（parameters / tool_calls / role: "tool"）——
 * 字段名不同，一次申请一次回填的往返结构完全相同。
 *
 *   export LLM_BASE_URL=… LLM_MODEL=… LLM_API_KEY=…
 *   node examples/t01-function-calling.mjs
 *
 * 教学示意，非生产代码：假数据、无参数校验分支、无重试。
 */
import { chatCompletion, readConfig } from './_llm.mjs';

const config = readConfig();

const TOOLS = [
	{
		type: 'function',
		function: {
			name: 'get_order_total',
			description: '按区域与季度查询已支付订单的聚合金额，不支持退款单与单笔明细',
			parameters: {
				type: 'object',
				properties: {
					region: { type: 'string', description: '销售区域，例如「华东」' },
					quarter: {
						type: 'string',
						enum: ['Q1', 'Q2', 'Q3', 'Q4'],
						description: '财年季度'
					}
				},
				required: ['region', 'quarter']
			}
		}
	}
];

// 客户端侧的「执行」：模型只有申请权，真正查库的是这段代码。
const ORDER_LEDGER = { '华东|Q2': '¥4,182,000' };

function execute(name, args) {
	if (name !== 'get_order_total') return { error: `未知工具 ${name}` };
	return ORDER_LEDGER[`${args.region}|${args.quarter}`] ?? '该口径下没有已支付订单';
}

const messages = [{ role: 'user', content: '华东第二季度的订单总额是多少？' }];

const first = await chatCompletion(config, { messages, tools: TOOLS, temperature: 0 });
const callMessage =
	first.kind === 'json' ? first.data.choices?.[0]?.message : { content: first.content };
const toolCalls = callMessage?.tool_calls ?? [];

if (toolCalls.length === 0) {
	console.log('模型这一轮没有申请工具，直接回了：');
	console.log(callMessage?.content ?? '');
	process.exit(0);
}

for (const call of toolCalls) {
	const args = JSON.parse(call.function.arguments || '{}');
	console.log(`← 模型申请：${call.function.name}(${JSON.stringify(args, null, 0)})`);
	messages.push({ role: 'assistant', content: null, tool_calls: [call] });
	messages.push({
		role: 'tool',
		tool_call_id: call.id, // 回填必须对得上 id，否则模型不知道结果属于哪次申请
		content: JSON.stringify(execute(call.function.name, args))
	});
}

const second = await chatCompletion(config, { messages, tools: TOOLS, temperature: 0 });
const answer =
	second.kind === 'json' ? (second.data.choices?.[0]?.message?.content ?? '') : second.content;
console.log('→ 回填后再调用一次，模型给出最终答复：');
console.log(answer);
