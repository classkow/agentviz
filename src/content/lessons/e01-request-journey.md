---
title: "E01 一次请求的旅程"
module: E
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

点击发送按钮只是触发了一次普通的事件处理，就像 Qt 里 clicked 信号进了槽函数。前端此刻做三件事：把输入文本作为一条 `role: "user"` 的消息追加进对话历史、打包请求体、禁用发送按钮防止重复提交。关键点在于「无状态」：服务端不记得你是谁，也不记得你们聊过什么，每一段历史都必须由客户端在每次调用时原样重发——这和 HTTP 本身的设计一致，服务端把会话状态完全外包给了调用方。

## 请求体长什么样

真正发出去的是一个 JSON。核心字段是 `model`（模型名）、`messages`（对话历史数组，每条含 `role` 与 `content`，role 取值 system/user/assistant 等）、`stream: true`（要求流式返回），以及 `temperature`、`max_tokens` 这类采样与截断参数。它经 HTTPS POST 到 `/chat/completions`，请求头里用 `Authorization: Bearer <API_KEY>` 鉴权。把它类比成一次结构体序列化后的 RPC：字段填错服务端直接 400，字段语义则完全由 OpenAI 兼容的 API 规范定义，DeepSeek、Anthropic 等各家文档都是这套形状或它的变体。

## token 化与排队

请求到达服务端后，第一步不是推理，而是 tokenize：把 messages 全文切分成 token 序列。token 是模型的计价与容量单位，粗略换算是 1 个英文字符 ≈ 0.3 token、1 个汉字 ≈ 0.6 token，准确值以响应里 `usage.prompt_tokens` 的回报为准——它同时决定你这次调用输入部分的费用和上下文窗口的占用。随后请求进入排队：各家 API 都有账号级并发上限，排队中的请求占用一个并发名额，超限的新请求直接吃 HTTP 429。从发出请求到流彻底结束，这段时间都算占用。

## 逐 token 生成

模型是自回归的：它一次只对「下一个 token」建模，采样出一个，把它拼回上下文，再算下一个。所谓「生成一段话」，就是这个循环重复几十到几千次。这解释了为什么输出越长越慢——latency 大致随 token 数线性增长，首 token 时间（TTFT）和后续每个 token 的间隔（ITL）是两套指标。循环何时停止？要么模型产出结束标记（`finish_reason: "stop"`），要么撞上 `max_tokens` 上限（`finish_reason: "length"`）。

## SSE 流式返回

`stream: true` 时，响应不是一次给完的 JSON，而是一条 Server-Sent Events 事件流：`Content-Type: text/event-stream`，服务端边生成边推。流由一帧帧文本组成，每帧是若干「字段名: 值」行，以一对换行结尾；OpenAI 兼容端点是 data-only 用法，只有 `data:` 行。每个数据帧是一个 `chat.completion.chunk` JSON，增量内容在 `choices[0].delta.content` 里；全部生成结束后服务端再发一条哨兵 `data: [DONE]` 表示流终止。整条流必须 UTF-8 编码，以冒号开头的行是注释，客户端应忽略。

## 前端渲染

对前端来说，这条 SSE 连接就像 Qt 里一个不断发射 readyRead 信号的 socket：字节流的到达边界和事件帧边界并不对齐，必须先缓冲、遇到空行才解析出一帧，取出 `delta.content` 追加到已有文本并触发界面重绘。点击「停止生成」就是主动断开连接，服务端检测到客户端中断后停止后续推送。收尾帧通常附带 `usage` 统计（prompt_tokens、completion_tokens、total_tokens），这是你对账和监控成本的唯一权威来源。至此，一次请求的旅程走完。
