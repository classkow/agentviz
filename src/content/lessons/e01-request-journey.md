---
title: "E01 一次请求的旅程"
module: E
readingMinutes: 5
level: intro
order: 1
description: "跟着一次真实点击，看完 API 请求从打包到前端逐字渲染的完整链路。"
sources:
  - "https://api-docs.deepseek.com/"
  - "https://docs.anthropic.com/"
  - "https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events"
  - "https://platform.openai.com/docs/api-reference/streaming"
reviewed_at: 2026-09-06
draft: false
demo: e01-request-journey
---

你在输入框敲下「明天北京适合野餐吗？」并点击发送，一两秒后文字开始逐字浮现在屏幕上。这中间到底发生了什么？这一课把这条链路拆成六个阶段逐个观察，正文上方的交互演示可以逐步回放同一条链路。对写过 C++/Qt 的你来说，可以全程拿系统调用和消息循环来对照：这是一次跨网络的、带流式回调的同步调用。

## 从一次点击开始

点击发送按钮只是触发了一次普通的事件处理，就像 Qt 里 clicked 信号进了槽函数。前端此刻做三件事：把输入文本作为一条 `role: "user"` 的消息追加进对话历史、打包请求体、禁用发送按钮防止重复提交。关键点在于「无状态」：服务端不记得你是谁，也不记得你们聊过什么，每一段历史都必须由客户端在每次调用时原样重发——这和 HTTP 本身的设计一致，服务端把会话状态完全外包给了调用方。这个设计有一个直接推论：断网之后点重试，前端必须把整包历史原样再发一遍，而不是只补发失败的那一句。发送按钮的禁用也不只是防手滑——它同时挡掉了同一内容被提交两次、在账单上重复计一次的风险。

## 请求体长什么样

真正发出去的是一个 JSON。核心字段是 `model`（模型名）、`messages`（对话历史数组，每条含 `role` 与 `content`，role 取值 system/user/assistant 等）、`stream: true`（要求流式返回），以及 `temperature`、`max_tokens` 这类采样与截断参数。它经 HTTPS POST 到 `/chat/completions`，请求头里用 `Authorization: Bearer <API_KEY>` 鉴权。把它类比成一次结构体序列化后的 RPC：字段填错服务端直接 400，字段语义则完全由 OpenAI 兼容的 API 规范定义，DeepSeek、Anthropic 等各家文档都是这套形状或它的变体。字段层面的失败各有归宿：JSON 缺字段或类型不对回 400，密钥缺失或失效回 401，字段全部合法但触发限流回 429。三类错误含义不同，重试策略也该不同——400 重发无意义，401 该提示换钥，只有 429 值得等待之后重试。[→ 回看演示第 2 步](#demo-step-2)

演示第 2 步「打包请求体」装的就是这么一份（与上方演示同一个 payload）：

```json
{
  "model": "deepseek-v4-flash",
  "messages": [
    { "role": "system", "content": "你是天气助手" },
    { "role": "user", "content": "明天北京适合野餐吗？" }
  ],
  "stream": true,
  "temperature": 1,
  "max_tokens": 1024
}
```

## token 化与排队

请求到达服务端后，第一步不是推理，而是 tokenize：把 messages 全文切分成 token 序列。token 是模型的计价与容量单位，粗略换算是 1 个英文字符 ≈ 0.3 token、1 个汉字 ≈ 0.6 token，准确值以响应里 `usage.prompt_tokens` 的回报为准——它同时决定你这次调用输入部分的费用和上下文窗口的占用。随后请求进入排队：各家 API 都有账号级并发上限，排队中的请求占用一个并发名额，超限的新请求直接吃 HTTP 429。从发出请求到流彻底结束，这段时间都算占用。这个规则有一个容易忽视的含义：流式请求占用名额的时间特别长——不是首 token 返回就释放，而是整个流结束才释放。遇到 429 的标准做法是指数退避后重试，而不是立刻重发，立刻重发只会让队列更堵。演示里这段等待被压缩成一步，真实链路上它往往是最不可控的一段。

## 逐 token 生成

模型是自回归的：它一次只对「下一个 token」建模，采样出一个，把它拼回上下文，再算下一个。所谓「生成一段话」，就是这个循环重复几十到几千次。这解释了为什么输出越长越慢——latency 大致随 token 数线性增长，首 token 时间（TTFT）和后续每个 token 的间隔（ITL）是两套指标。循环何时停止？要么模型产出结束标记（`finish_reason: "stop"`），要么撞上 `max_tokens` 上限（`finish_reason: "length"`）；OpenAI 与 DeepSeek 还定义了 `tool_calls` 等取值（按调用方文档为准）。工程上这一步被拆成两段：prefill 把整段提示词一次性编码进模型内部状态，decode 再逐 token 往外吐；TTFT 主要由 prefill 决定、随输入变长而变慢，ITL 则由单步解码速度决定、大体恒定。因为每个 token 都依赖前一个，生成无法并行——再强的算力也只能让字出现得更快，而不能让它们同时出现。

## SSE 流式返回

`stream: true` 时，响应不是一次给完的 JSON，而是一条 Server-Sent Events 事件流：`Content-Type: text/event-stream`，服务端边生成边推。流由一帧帧文本组成，每帧是若干「字段名: 值」行，以一对换行结尾；OpenAI 兼容端点是 data-only 用法，只有 `data:` 行。每个数据帧是一个 `chat.completion.chunk` JSON，增量内容在 `choices[0].delta.content` 里；全部生成结束后服务端再发一条哨兵 `data: [DONE]` 表示流终止。整条流必须 UTF-8 编码，以冒号开头的行是注释，客户端应忽略。SSE 的一个常见坑在中间环节：某些反向代理和网关默认整段缓冲响应，流式到了它们手里会退化成攒齐再发，前端表现为长时间沉默后整段文字瞬间出现；排查时先看响应头有没有被改写。规范还允许服务端随时发送冒号开头的心跳注释行，防止长连接被中间设备掐断，客户端按约定忽略即可。

## 前端渲染

对前端来说，这条 SSE 连接就像 Qt 里一个不断发射 readyRead 信号的 socket：字节流的到达边界和事件帧边界并不对齐，必须先缓冲、遇到空行才解析出一帧，取出 `delta.content` 追加到已有文本并触发界面重绘。点击「停止生成」就是主动断开连接，服务端检测到客户端中断后停止后续推送，已收到的部分通常保留在界面上，丢弃还是保留由产品决定，服务端的生成资源则随连接关闭而释放。DeepSeek 在流式收尾帧附带 `usage` 统计（官方中文流式示例即如此），这是你对账和监控成本的唯一权威来源。OpenAI 兼容端点默认不附带 usage，需传 `stream_options: {"include_usage": true}`，OpenAI 会在 `data: [DONE]` 之前单发一条 usage 帧。至此，一次请求的旅程走完。回看全链路，token 是贯穿始终的计量单位：它怎么切分、怎么计价是 E02 的主题，逐 token 采样时概率分布如何被温度与截断参数重塑则是 E03 的内容。


> **带走三句话**
>
> 服务端是无状态的：它不记得你是谁，也不记得你们聊过什么，整段历史都得由客户端每次原样重发。
>
> 流式没有发明新协议：`stream: true` 只是把一次给完的 JSON 换成一条 SSE 帧流，增量逐帧到达，末尾一条哨兵帧表示流终止。
>
> 对账只认响应里的 usage 统计：它报出的 token 数才是费用与窗口占用的权威口径，字符换算口诀只配估个量级。

## 演示数据说明

上方泳道演示中的数字均为教学构造口径：请求体 196 B、首 token 耗时 480 ms、prompt_tokens 为 37、共生成 128 个 token、usage 合计 165，以及 HTTP/1.1 同域 6 条并发连接、HTTP/2 默认 100 条流、排队 10 分钟上限，都是为讲清流程与数量级而设的示例值，并非任何厂商的真实承诺或报价。真实的是结构：打包、排队、生成、SSE 回流的先后顺序，以及请求体与 SSE 帧的字段名，均与 OpenAI 兼容 API 的官方文档一致。正文里的代码块同为教学示意，用的是演示同一份 payload，字段结构对齐官方文档。