# examples/

五门配了代码块的课程各带一个可运行的最小脚本。脚本与课上那段请求体是同一份 payload，
差别只在于这里真的把它发出去。

| 脚本 | 对应课 | 演示的往返 |
| :--- | :--- | :--- |
| `e01-request-journey.mjs` | E01 一次请求的旅程 | `stream: true` → 逐帧解析 SSE → `usage` 对账 |
| `p01-structured-prompts.mjs` | P01 结构化提示 | 四段式 system 提示 → 只要一个 JSON 对象 |
| `t01-function-calling.mjs` | T01 函数调用 | 申请工具 → 客户端执行 → 按 id 回填 → 再调用 |
| `r01-rag-pipeline.mjs` | R01 RAG 全景流水线 | 嵌入查询 → 相似度召回 → 拼 `<docs>` 开卷作答 |
| `g02-cost-engineering.mjs` | G02 成本工程 | 稳定前缀连发两次 → 按 usage 折算缓存账单 |

## 运行

需要 Node.js 20 或以上（脚本用全局 `fetch` 与顶层 `await`，无任何第三方依赖）。

```sh
export LLM_BASE_URL="https://<你的 OpenAI 兼容端点>/v1"
export LLM_MODEL="<模型名>"
export LLM_API_KEY="<密钥>"

node examples/e01-request-journey.mjs
```

三个必填变量缺任何一个，脚本都会打印缺了哪个、怎么用，然后以状态码 1 退出——
不会带着空端点去发请求、再抛一个看不懂的连接错误。

## 环境变量

| 变量 | 必填 | 用在哪些脚本 | 说明 |
| :--- | :--- | :--- | :--- |
| `LLM_BASE_URL` | 是 | 全部 | OpenAI 兼容端点的根地址，含 `/v1`，末尾斜杠可有可无 |
| `LLM_MODEL` | 是 | 全部 | 对话模型名 |
| `LLM_API_KEY` | 是 | 全部 | 密钥，走 `Authorization: Bearer` |
| `LLM_EMBED_MODEL` | R01 必填 | `r01-rag-pipeline.mjs` | 嵌入模型名。建库与查询必须是同一个模型，换模型等于换向量空间 |
| `LLM_RATE_PER_MILLION` | 否（默认 4） | `g02-cost-engineering.mjs` | 每百万输入 token 的示例费率（元），只为把账单算出来 |

## 免责

这些是**教学示意，不是生产代码**。具体地说：

- 没有重试、超时、退避与流中断处理；网络一抖就直接抛。
- 没有参数校验、权限判断与结果清洗，T01 的「执行」是一张写死的字典。
- 密钥只从环境变量读，脚本里没有任何默认端点、默认模型或示例密钥。
- 所有 token 数、费率、相似度分数、金额都是示意口径，不是任何厂商的真实承诺或报价。
- T01 课上那段代码块写的是 Anthropic 形状（`input_schema` / `tool_use` / `tool_result`），
  脚本发的是 OpenAI 兼容形状（`parameters` / `tool_calls` / `role: "tool"`）——
  字段名不同，一次申请一次回填的结构完全相同。
