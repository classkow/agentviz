---
title: "A01 Agent = LLM + 循环 + 工具"
module: A
order: 1
description: "把 Agent 还原成一个朴素结构：单次调用的模型，外面套一个循环，再递给它工具。"
sources:
  - "https://www.anthropic.com/engineering/building-effective-agents"
  - "https://arxiv.org/abs/2210.03629"
reviewed_at: 2026-09-06
draft: true
---

> 本课为骨架占位：正文引导语与结构先立起来，正式内容与交互演示由内容团队在后续里程碑补齐。

## 模型是单次调用

API 背后的模型只做一件事：给一段上下文，返回一段文本。它不会自己再来一次，也没有跨请求的记忆。

## 给模型一个循环

Agent 的第一个零件不是更聪明的模型，而是一个 while 循环：把输出拼回输入，再调用一次。所谓"自主"就诞生在这里。

## ReAct：Thought-Action-Observation

ReAct 把每一圈固定成三段：模型先想（Thought）、再选工具（Action）、我们执行后把结果回灌（Observation）。

## 一次完整任务回放

以"查明天北京天气并判断是否适合野餐"为例，逐圈回放一次完整 episode，看循环如何收敛到答案。

## 失控与护栏

循环也可能永远不收敛：死循环、错误累积、上下文爆炸。护栏（最大迭代数、人工确认、预算上限）是 Agent 的必备部件。
