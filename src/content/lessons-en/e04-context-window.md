---
title: "The Context Window: a contract with limits"
module: "E"
readingMinutes: 5
level: intro
order: 4
description: "The context window is the token budget a single call can hold — input and output share it, and overflow means truncation, an error, or silently dropped history."
sources:
  - "https://docs.anthropic.com/en/docs/build-with-claude/context-windows"
  - "https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them"
reviewed_at: 2026-09-06
draft: false
demo: "e04-context-window"
component: "token"
---

The previous lesson, E03, watched the model draw from a probability distribution on the generation side; this lesson steps back to look at the container that holds it all: the context window. E02 noted that the window holds the token total of the entire message history, but "total" badly understates it — the window is a contract with a hard ceiling, and multi-turn history, retrieved material, and the answer the model is about to write all crowd into the same budget. The window ledger above dissects one support-ticket conversation, splitting a single 8192-budget request into five entries: the system prompt, two rounds of historical turns, this turn's new input, and the output reserve.

## One contract, shared by input and output

The precise definition of the window: the maximum number of tokens the model can "see" in one API call. Note "one call" — the model has no memory across requests; a multi-turn conversation is the application re-sending the history with every turn. Window size is a hard parameter of model selection: models range from a few thousand to over a million tokens, several orders of magnitude apart, with price and capability moving accordingly; larger windows usually cost more and respond more slowly, so pick by the task's actual needs rather than reflexively buying the biggest. Note also "shared by input and output": the window does not hold only the input — the answer the model is about to generate lives in the same room, so the budget has two columns: the input side (system + history + this turn) plus the output reserve must not exceed the ceiling. The ledger's request reserves 2048 for max_tokens, leaving 6144 for input; if you reserve nothing for output, the output gets squeezed out, generation stops mid-sentence, and finish_reason is marked length — the "hard-truncated rather than finished naturally" case from E02.

## Three ways overflow ends

What happens when the window overflows? First, truncation: the input is chopped head or tail, the model sees a mangled text, and the answer is naturally off the mark. Second, an error: many APIs simply reject the request with a 400-class error, and the caller gets nothing instead of an answer. Third — the most dangerous — silently dropped history: to avoid the error, the application layer trims the old history on its own before sending. The request succeeds, the answer flows smoothly, but the model has no idea it lost context, and it disowns everything promised in earlier rounds. The first two are at least visible, with the diagnostic signals of finish_reason=length and the response status code — though vendors differ in exactly how they behave (truncate or reject, and what they cut first), so check the documentation before integrating. The third is a quiet failure where the logs all look fine; only an evaluation set and post-launch user feedback can catch it.

## History accumulation: the main consumer

The proportions in the ledger say it all: the genuinely new input this turn is only 1150 tokens, while the system prompt plus two rounds of history take 4050. Multi-turn conversations dominate window consumption because history only ever grows — each round permanently adds the previous turn's question and answer to the window, and every new request pays the input cost of the full history again. Run one number with the ledger's example rate: a 1400-token system prompt re-billed 1000 times is 1.4 million tokens, about ¥5.60 at ¥4/M — and that is the system line alone. Agent scenarios are harsher: in the A02 episode replay, every tool observation flows back into the context in full, and after a few retrieval rounds the history dwarfs the original question by dozens of times. As window consumption climbs, first-token latency climbs with it — the longer the input, the slower the prefill, which is why long conversations degrade turn by turn.

## Context engineering: what to pack into a finite budget

With a finite budget, "what to pack" becomes an engineering decision — the essence of context engineering. Four things usually compete for space in the window: the system prompt (role and boundaries), message history, retrieved material (the star of the R module), and output headroom. One practical approach is to assign budget ratios up front: for an 8192 window, cap the system prompt at 1500, retrieved material at 2000, reserve 2048 for output, and leave the rest to history — the ratios shift per task, but they must be set explicitly, not left to history growing wild until an error forces the issue. Rank the trades by value: first, history compression — fold distant turns into a summary that keeps the key facts and frees a large block of budget; second, retrieval curation — put only the most relevant passages into the window, not whole documents; third, keep enough output headroom so answers are not cut off at length; only last, trim the system prompt — that one always goes last, because role and boundaries are the safety floor.

## The window is a contract, not a memory

Nail down one last confusion: the window creates the illusion that the model "remembers the earlier text", but it is a contract, not a memory — every request is one-shot, the window's contents go out with the request and vanish when the response ends, and anything worth keeping must be stored by the application itself. That is why "memory" is an engineering problem in its own right: the trade-offs among sliding windows, summaries, and external stores get their own lesson in A03. The practical takeaways here are three: set budget ratios per content type and write them into configuration; estimate tokens before sending each request; and watch finish_reason and the usage field so truncation and silently dropped history never happen unnoticed.

## About the demo data

The token counts in this ledger (1400/1050/1600/1150/2048, summing to 7248 with 944 to spare) are illustrative teaching data, not the output of any real tokenizer: the source-text panel shows excerpts only, and tokenCount reflects the constructed budget of the full content. Window sizes and billing differ per model; accurate figures come from official documentation and the response's usage. The rate of ¥4/M tokens is an example rate, not any vendor's quote.
