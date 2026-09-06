---
title: "Token Anatomy"
module: "E"
order: 2
description: "Models price, generate, and account context in tokens — the same stretch of text can differ several-fold in token count."
sources:
  - "https://docs.anthropic.com/en/docs/build-with-claude/token-counting"
  - "https://api-docs.deepseek.com/quick_start/token_usage"
reviewed_at: 2026-09-06
draft: false
demo: "e02-token-anatomy"
component: "token"
---

The previous lesson followed one request all the way from the browser to the GPU; this lesson zooms into its most basic unit of account: the token. The anatomy bench above puts six common stretches of text on the table — for the same 「stretch of characters」, Chinese, English, code, and emoji can differ several-fold in token count, while both billing and context-window occupancy are counted in tokens.

## What the model sees: tokens, not characters

The model never reads or writes characters directly — it works on tokens. A tokenizer first splits text into vocabulary entries, each entry mapping to an integer ID; what the model actually sees is a sequence of IDs. The mainstream algorithm, BPE (byte pair encoding), can be summarized in one sentence: start from single bytes and repeatedly merge the most frequent adjacent pair in the corpus into a new entry until the vocabulary reaches its target size. Frequent words therefore end up as a single token, while rare or long words get split into subword pieces or even raw bytes. Two facts follow, and both matter: the model emits text one token at a time, and APIs bill per token — token is the shared unit of generation and pricing.

## Where splitting differs: Chinese vs. English, code, and emoji

The same number of characters can yield several-fold different token counts, and the six comparisons in the demo above are the evidence. Chinese has no spaces to serve as natural boundaries and is often segmented at 1–2 characters per token; frequent English words are mostly one token each, while long words get split into subwords. In mixed Chinese–English text, isolated single-character tokens tend to pop up at script boundaries, so the bill is often underestimated. Code has the highest token density: identifiers, indentation, and punctuation each become tokens, and two short lines of a call can eat dozens. The most expensive is emoji — the 「lightest」 character on the interface often takes 2–3 tokens on the bill. To save tokens, watch code snippets, long order numbers, and emoji-heavy content first.

## Two bills: pricing and the context window

The `usage` field of an API response has three siblings: prompt_tokens (input), completion_tokens (output), and total_tokens (the sum). Billing prices input and output separately, and the output rate is usually several times the input rate — getting the model to 「say less」 often saves more than asking less. The other bill is the context window: the window holds the token total of the entire conversation history, and every new round makes you pay the input cost of all historical tokens again. DeepSeek's documentation offers a rough mnemonic: 1 Chinese character ≈ 0.6 tokens, 1 English character ≈ 0.3. Such mnemonics are only good for estimating an order of magnitude — the accurate number is always the `usage` in the response.

## Controlling cost: start with text hygiene

The first gate of cost control is max_tokens: set a ceiling on output and check `finish_reason` in the response — a value of length means generation was hard-truncated rather than finished naturally, so the answer is probably incomplete and you should raise the ceiling or split the task. The second gate is text hygiene: keep program-generatable identifiers such as order numbers and timestamps on the code side and concatenate them there — long digit runs get split segment by segment, which is pure waste. Third, de-duplicate and structure: delete pleasantries and repeated background, replace prose with clear structural markers, and you can often cut input tokens noticeably without losing effect.

## Tokens and engineering decisions

Token awareness changes engineering decisions directly. When budgeting context, count the system prompt, conversation history, retrieved passages, and output headroom together, then add a buffer for spikes — the window is not 「use what you can」; requests that exceed it are rejected outright. First-token latency of a streamed response also scales with the prompt's token count — the longer the input, the slower prefill and the later the first token, which is one root cause of long-context experiences degrading. The next lesson, E03 The Sampling Lab, is already live: it covers how the generation side draws from the probability distribution over candidate tokens; E04 after that covers context and memory — what to do when the window no longer fits.

## About the demo data

The token counts and segmentation boundaries in this page's demo are illustrative teaching data, not the output of any real tokenizer; every vendor and model has a different vocabulary and different splits, so use official tooling (such as Anthropic's token-counting API) for accurate counts. The rate on the cost card is an example rate, not any vendor's quote.
