---
title: "Parallel Tool Calls"
module: "T"
readingMinutes: 4
level: intro
order: 2
description: "When one reply emits several tool_calls they run concurrently if independent — parallelism slashes total latency, but dependencies force serialization."
sources:
  - "https://docs.anthropic.com/en/docs/build-with-claude/tool-use/parallel-tool-use"
  - "https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/function-calling"
reviewed_at: 2026-09-06
draft: false
demo: "t02-parallel-tools"
---

The previous lesson split one tool call into its full round trip: request, validate, execute, reply. This lesson answers the natural follow-up: what happens when the model emits two or three requests at once? The swim lane timeline above plays a "compare two cities' weather" task — the model produces two `tool_use` blocks in a single reply, the client executes them concurrently, replies by id one by one, and summarizes at the end. The whole run costs one serial query's latency rather than two added together. It is the most direct latency lever available, and its preconditions are stricter than they look: used right it halves the wall clock, used wrong it manufactures errors.

## Several requests in one reply

The model can absolutely place multiple `tool_use` blocks in one reply: it does so whenever the task splits naturally — comparing two cities, fetching three fields at once, retrieving from two documents independently. Each block carries its own id and input, and none references another; from the model's point of view they wait for nothing. Task phrasing influences the choice: words like "compare", "respectively", or "check both" noticeably raise the odds of parallel requests, while a task written as ordered steps pushes the model toward serial requesting. Note that the decision "to parallelize or not" is not the model's: it only lays the requests out; how they run is the client's scheduling problem. Some APIs let you switch parallel output off and force one request per reply — the right move when tools may interfere with each other or downstream concurrency is scarce.

## Only the independent may run in parallel

The criterion is one line: does a later request need an earlier request's result to build its parameters? Both city names are constants the model supplied directly — mutually independent, so they can go out together. Conversely, in "look up the city code first, then query the weather with it", the second request's parameters cannot even be written before the first result returns; it must serialize. Misjudging has a real price: parallelizing dependent requests either fails outright on missing parameters, or worse, the client invents the missing parameter — and the error propagates silently downstream. So the dependency check before dispatch is not ceremony; it is the correctness gate. The checking logic lives in code — walk each block's input fields against where they came from — and a few dozen lines cover the vast majority of cases.

## Pairing the replies by id

Completion order in a concurrent world is uncontrollable: you dispatch #1 and #2, and #2 may come home first. The client buffers each result under its `tool_use_id` and replies only when all have arrived — replying with a partial set would let the model answer on incomplete observations. Id pairing is the anchor of correctness in an out-of-order world, which is why the previous lesson called the trivial-looking id the lifeblood. Implementation is usually a map keyed by id plus an "all arrived" counter — a dozen lines of code, but without them concurrency becomes an incident factory. Each concurrent task should carry its own timeout: when a batch times out, reply with whatever arrived as-is and the missing ones as timeout errors, letting the model decide on the wreckage — far better than hanging the whole batch.

## Dependencies force waiting

When the task genuinely depends, the correct posture is multiple rounds: dispatch the first request, wait for the reply, and let the model issue round two based on the result. The extra serial time is the price of correctness, and it is not negotiable. What engineering can compress is the waiting: only the first link of a dependency chain must serialize, and once the chain completes, the independent branches it spawns can go parallel again in the next round. Design for partial failure too — of two concurrent queries, one may succeed while the other times out; reply with the failed one marked is_error (the theme of T03) and let the model decide its next step from half the facts plus one error message, instead of voiding the whole batch.

## Concurrency is the client's freedom

Zoom out: the model only requests; how they execute — concurrent, serial, queued, rate-limited — is entirely the client's freedom and responsibility. The same "two requests" can run serially in test and through a bounded worker pool in production, and the model neither knows nor needs to know. One more account to settle beside concurrency — the cost one: parallelism does not change the token total, only the latency structure; turning a serial batch concurrent saves wall-clock time and occupies downstream capacity in an instant. When the downstream has a concurrency ceiling, gate the fan-out: cap in-flight requests at N and queue the rest, or one wave of enthusiasm becomes an outage — turning a latency optimization into a failure factory. That freedom is the real leverage of the function-calling architecture: without touching a line of prompt, changing only client scheduling turns a batch's cost from "serial additions" into "the slowest one". The next lesson watches this chain break — failure is the norm, and guardrails are required coursework.

## About the demo data

The weather values (Beijing clear 14–26°C, Shanghai cloudy 18–28°C) and JSON examples in the swim lane demo are illustrative teaching data, not real API output; the multi-block `tool_use` structure and id-paired replies align with official documentation semantics, and the demo omits engineering details such as worker pools, timeouts, and retries.
