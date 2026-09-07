---
title: "Memory: Windows, Summaries, and External Stores"
module: "A"
readingMinutes: 4
level: intermediate
order: 3
description: "Models are stateless by nature — 'memory' is all engineering scaffolding: sliding windows, summary compression, and external stores each occupy an end of the fidelity-cost-complexity trade."
sources:
  - "https://www.anthropic.com/engineering/building-effective-agents"
  - "https://arxiv.org/abs/2304.03442"
reviewed_at: 2026-09-06
draft: false
demo: "a03-memory"
---

E04 said the window is not memory — the moment a request ends, the window's contents scatter. Users in real products do not know this: they expect "you remember what I said last time." Turning that expectation into engineering is this lesson's subject: memory. The swim lane timeline above runs the same 20-turn conversation through two memory strategies: the sliding-window version answers the turn-20 task wrongly, the summary version answers it right — same model, the difference is only how history is kept.

## The stateless model and the scaffolding nature of memory

Nail the fact down first: the model holds no state across requests. The only mechanism behind "remembering the last turn" is re-sending the last turn into the window — all memory is the application layer's storage and refill decisions made outside the window. This fixes the engineering perspective: memory is not a model capability, it is a data-structure design. You choose the store (in-memory, database, vector store), the eviction policy (what to keep, what to drop), and the refill timing (carry everything, or retrieve on demand) — every choice rewrites answer quality and cost. E04's budget table continues here: the essence of a memory strategy is deciding, inside a finite window, "which slice of the past deserves a seat in the next few rounds." Users' expectations of memory come in layers: remembering stated preferences (a must), remembering unfulfilled promises (a must), remembering every word verbatim (a false need) — layer the expectations and the memory strategy has a target.

## The sliding window: simplest, and best at losing anchors

The sliding window keeps only the last N turns and drops everything older wholesale. Implementation cost is near zero: a fixed-length array. Its failure mode shows in the demo: the three hard constraints set in turn 1 (budget, color, invoice name) were squeezed out of the window long before the turn-20 checkout, and the model could only guess — a personal-name invoice over budget. The deep defect of the sliding window is "indifference": it evicts by time, blind to importance; and task anchors usually appear at the very start of a conversation, precisely the position evicted first. Sliding windows suit conversations with low anchor density and loose structure (chitchat, chained one-shot Q&A); any task with the shape "rules set at the start, used at the end" makes a bare sliding window a time bomb.

## Summary compression: one generation buys a big block of budget

The summary strategy folds distant history into a summary paragraph and keeps recent turns verbatim. In the demo, the first 12 turns compress into roughly 200 tokens; with the last 8 turns at 1600, history drops from 5200 to 1800 — window usage down 65%, constraints retained 3/3. The key discipline of summarization is "compression is not disposal": constraints, promises, and anomalies must be written into the summary body item by item, never left to the model's "general gist"; and generating the summary deserves its own structured prompt (P01's quartet applies) — an instruction like "list all unfulfilled promises and hard constraints" beats "summarize the conversation" by miles. Engineering-wise, summaries trigger at two moments: by token threshold (compress once nearing the ceiling) or by turn count (roll every N turns); generation runs asynchronously in the background and never blocks the live request. Count the costs too: every compression pays for one model call, and summaries risk distortion — numbers, dates, and proper names go stale in summaries most easily, so critical values stay as verbatim quotes.

## External stores: the heaviest artillery, the highest fidelity

The third strategy moves memory out of the window entirely: conversation highlights, user profiles, and task states live in a database or vector store and get retrieved back when needed. Fidelity is highest — nothing is lost — and cross-session memory comes naturally: today's remembered preferences are still there tomorrow. The price is the heaviest implementation: maintain the store's structure, write the retrieval logic, decide "what to fetch when" — each step opens new failure surfaces. It is fully isomorphic with R02/R03's retrieval technology — "treat history as a knowledge base to search" is RAG thinking applied to memory; an external store also buys auditability outside the window — what was stored and when is on the ledger. The common practice is a layered combination: sliding window for the recent, summaries for the middle, external stores for long-term and cross-session; Generative Agents' memory stream (retrieval weighted by time and importance) is the classic design on this route.

## The trade-off table and the privacy boundary

Put the three strategies in one table: fidelity — sliding window lowest, summary middle, external store highest; cost — sliding window nearly free, summary pays per compression, external store adds retrieval calls; implementation complexity — increasing in the same order. The first question of selection is not "which is fancier" but "how long do the task's anchors live": short single-session tasks suit the sliding window; multi-turn task conversations need at least summaries; a product that "remembers the user" needs external stores. Finally the privacy boundary: cross-session memory means storing personal information — how long it is retained, what it is used for, whether users can view and delete it — these are not legal boilerplate but feature design. "Remember everything" is a selling point in marketing and a liability in compliance. Memory is why agents feel endearing, and it is where they most need restraint.

## About the demo data

The conversation content, turn count (20), window figures (8192/5200/4600/1800), and the wrong order (personal-name invoice, ¥620, correct ¥478) in the swim lane demo are illustrative teaching data, not real system output; the behavioral descriptions of the three memory strategies align with public engineering practice and research literature.
