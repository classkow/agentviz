---
title: "The Journey of a Request"
module: "E"
order: 1
description: "Follow one real click end to end: from a packaged request body to text rendering token by token on screen."
sources:
  - "https://api-docs.deepseek.com/"
  - "https://docs.anthropic.com/"
  - "https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events"
  - "https://platform.openai.com/docs/api-reference/streaming"
reviewed_at: 2026-09-06
draft: false
demo: "e01-request-journey"
---

You type 「明天北京适合野餐吗？」 into the input box and click send; a second or two later, characters start appearing on screen one by one. What happened in between? This lesson breaks that pipeline into six stages and walks each one, and the interactive demo above the prose replays the same journey step by step. If you come from a systems-programming background, map the whole thing onto syscalls and an event loop: it is one synchronous call across a network, with a streaming callback.

## It starts with one click

Clicking send triggers an ordinary event handler, just like a clicked signal arriving in a slot. At this moment the front end does three things: append the input text as one more `role: "user"` message in the conversation history, assemble the request body, and disable the send button to prevent double submits. The key property is statelessness: the server has no idea who you are or what you have talked about, and the client must resend the entire history verbatim on every call — consistent with HTTP's own design, where the server outsources session state entirely to the caller.

## What the request body looks like

What actually goes out is a JSON document. The core fields are `model` (the model name), `messages` (the conversation history array, each entry with a `role` and `content`, where role is system/user/assistant and so on), `stream: true` (asking for a streamed response), plus sampling and truncation parameters such as `temperature` and `max_tokens`. It travels as an HTTPS POST to `/chat/completions`, authenticated by `Authorization: Bearer <API_KEY>` in the headers. Think of it as an RPC over a serialized struct: wrong fields get a 400 from the server, and field semantics are defined entirely by the OpenAI-compatible API spec — DeepSeek, Anthropic, and the rest all document this shape or a variant of it.

## Tokenization and queueing

When the request reaches the server, the first step is not inference but tokenize: split the full text of messages into a token sequence. Tokens are the model's unit of pricing and capacity. A rough conversion says 1 English character ≈ 0.3 tokens and 1 Chinese character ≈ 0.6 tokens; the authoritative value is always `usage.prompt_tokens` in the response — it simultaneously determines what the input part of this call costs and how much of the context window it occupies. Then the request queues: every provider has an account-level concurrency cap, a queued request holds one concurrency slot, and requests beyond the cap get HTTP 429 immediately. From the moment a request is sent until the stream fully ends, that slot is occupied.

## Token-by-token generation

The model is autoregressive: it models only 「the next token」, samples one, appends it to the context, and computes the next one. What we call 「generating a passage」 is this loop repeating dozens to thousands of times. That explains why longer output is slower — latency grows roughly linearly with token count, and time-to-first-token (TTFT) and inter-token latency (ITL) are two separate metrics. When does the loop stop? Either the model emits an end marker (`finish_reason: "stop"`) or it hits the `max_tokens` ceiling (`finish_reason: "length"`); OpenAI and DeepSeek also define values such as `tool_calls` (check each provider's documentation).

## SSE streaming

With `stream: true`, the response is not one finished JSON document but a Server-Sent Events stream: `Content-Type: text/event-stream`, pushed by the server as generation proceeds. The flow consists of text frames, each frame being a few 「field name: value」 lines closed by a blank line. The OpenAI-compatible convention is to send only `data:` lines; the SSE spec itself also supports fields such as `event:` / `id:` / `retry:`, which neither OpenAI nor DeepSeek uses. Each data frame is a `chat.completion.chunk` JSON whose incremental content sits in `choices[0].delta.content`; once generation finishes, the server sends the sentinel `data: [DONE]` to mark the end of the stream. The whole stream must be UTF-8 encoded, and lines starting with a colon are comments that clients should ignore.

## Front-end rendering

To the front end, this SSE connection behaves like a socket that keeps firing a readyRead signal: byte-read boundaries do not align with event-frame boundaries, so the client must buffer, parse a frame at every blank line, take `delta.content`, append it to the existing text, and repaint. Clicking 「stop generating」 deliberately closes the connection, and the server — detecting the client hang-up — stops pushing. DeepSeek attaches a `usage` block to the streaming final frame (its official Chinese streaming example does exactly this); that block is the single authoritative source for reconciling and monitoring costs. OpenAI-compatible endpoints do not include usage by default: pass `stream_options: {"include_usage": true}` and OpenAI will send a dedicated usage frame right before `data: [DONE]`. And with that, the journey of a request is complete.

## About the demo data

The numbers in the demo above — the token counts 37/128/165, the frame numbering, and the field values — are illustrative teaching data (not real model output), chosen to match the shape of a real streaming call. Field names and frame structure mirror the official documentation of the OpenAI-compatible API.
