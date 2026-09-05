---
title: "E01 一次请求的旅程"
module: E
order: 1
description: "跟着一次真实点击，看完 API 请求从打包到前端逐字渲染的完整链路。"
sources:
  - "https://api-docs.deepseek.com/"
  - "https://docs.anthropic.com/"
  - "https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events"
reviewed_at: 2026-09-06
draft: true
---

> 本课为骨架占位：正文引导语与结构先立起来，正式内容与交互演示由内容团队在后续里程碑补齐。

## 从一次点击开始

用户在输入框敲下一句话并点击发送，模型侧会发生什么？这一课把这条链路拆成六个阶段逐个观察。

## 请求体长什么样

一次调用真正发出去的是一个 JSON：模型名、messages 数组、以及 temperature 等采样参数。先看清它的形状，再谈后面的事。

## token 化与排队

文本会先被切成 token，token 数决定计费与上下文占用；请求进入服务端后还要经过排队才开始计算。

## 逐 token 生成

模型是自回归的：一次只产出下一个 token，再把它喂回去继续。所谓"生成"就是这一循环重复几十到几千次。

## SSE 流式返回

服务端边生成边推，通过 Server-Sent Events 一段段把 token 送回浏览器，而不是等全部算完再响应。

## 前端渲染

前端拼接增量片段并逐字上屏，同时要处理中断、错误与"停止生成"。到这里，一次请求的旅程才算走完。
