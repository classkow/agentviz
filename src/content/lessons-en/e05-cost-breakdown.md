---
title: "The Cost of a Token"
module: "E"
order: 5
description: "Billing = input rate × input tokens + output rate × output tokens, with output several times pricier; the real lever is generating less."
sources:
  - "https://openai.com/api/pricing/"
  - "https://api-docs.deepseek.com/quick_start/pricing"
  - "https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching"
reviewed_at: 2026-09-06
draft: false
demo: "e05-cost-breakdown"
component: "token"
---

E02 covered how the three usage siblings in an API response count tokens; this lesson turns counts into money — three implementation plans for the same task go onto the billing bench to show where the cost actually lands. The three bills above correspond to one support-reply task: Plan A is one vague line plus write-whatever, Plan B is a structured prompt plus a short output, and Plan C lets a stable prefix hit the cache on top of B. The three bills answer one question: for the same effect, where does the money go, and where does it come back. Once you have read these three bills, "cost" stops being a finance term and becomes a design parameter, ranked alongside latency and accuracy.

## The billing formula: two lines of arithmetic

The API billing formula has only two lines: input tokens × input rate, plus output tokens × output rate. However intricate a vendor's pricing page looks — tiered pricing, monthly plans, volume discounts — it reduces to these two lines per call; reconcile it by multiplying each usage field by its rate, and every cent on the invoice reproduces itself. The structurally crucial fact: the output rate is usually several times the input rate — in the example bills, input ¥4/M and output ¥16/M, a 4× gap. The reason lies in compute: input tokens are processed in one parallel prefill pass, while output tokens must be generated serially, one full forward pass each. So getting the model to "say less" often saves more than making it "read less" — this ratio dictates the ranking of every optimization that follows.

## Output cost cannot be known precisely in advance

Input length is fixed before the request is sent; output length is known only after generation finishes — the "think-and-write-as-you-go" process means output cost can never be precisely determined in advance, only estimated. This is more than a bookkeeping nuisance: budgets, rate limits, and external quotes all depend on "roughly how much one call costs", and a bad estimate means either overspending or selling at a loss. Three practical ways to estimate: use the historical mean output of past calls, with a percentile (say P95) covering the long tail; set a business-driven ceiling (max_tokens) to pin down the worst case; and for structured tasks, use a format declaration to cap output length, turning "how long at most" into a designable parameter. Plan B's "reply at most 80 characters" is exactly this move — output drops from 1600 to 450 tokens not by luck, but by writing the length into the constraint. One emphasis: a wrong estimate is survivable, but no ceiling is not — without max_tokens as the backstop, a single runaway long answer can blow through a per-call budget.

## The arithmetic of three bills

Put the three bills side by side (constructed basis: 100k calls/day, a 30-day month, example rates of ¥4/M input and ¥16/M output). Plan A: input 900 + output 1600, ¥0.0292 per call, about ¥87,600/month. Plan B: input 1500 + output 450, ¥0.0132 per call, about ¥39,600/month — the format declaration costs a few hundred extra input tokens, yet the output savings far outweigh them, the direct corollary of "output costs 4×". Plan C: of the 1500 input tokens, 1200 hit the cache and bill at one tenth of the price, plus output 450 — ¥0.00888 per call, about ¥26,640/month. Compared side by side: B saves ¥48,000/month over A, C saves another ¥12,960 over B, and C is 70% cheaper than A overall. Look once more: all three bills use the same model, the same rates, and the same task with the same effect — not one cent of the savings comes from "switching to a cheaper model"; all of it comes from two engineering moves, "generate less" and "hit the cache".

## Ranking the levers, and model differences

Unit prices for the same task can differ tens of times across models, and switching models is a card you can play — but it is the last one: capability, window size, and embedding dimensions all need re-evaluation, and switching carries migration cost — the R module covers the price of re-embedding an entire library when the embedding model changes. In day-to-day engineering the levers rank like this: first, caching — fix the stable, unchanging prefix (system, format declaration, knowledge-base index) byte for byte; hits bill at a deep discount, and the hit rate decides the savings; second, lean output formats — structured short output improves cost and latency at once; third, ceilings — max_tokens pins the worst case. All three point the same direction: generate less. One more lever sits outside the system and is easy to miss: many tasks never needed a large prefix on every call, and sorting out "which requests deserve the knowledge base and which need one sentence" with proper routing saves more than any billing trick.

## Cost awareness starts at the first line of code

Cost is not a report patched together after launch; it is an awareness to carry from the first line of code: every response ships a usage receipt, and only by aggregating those receipts do you get the ledger of "who is spending, and on what". That ledger is the foundation of lesson G02 on cost engineering, which expands the before-and-after bills, budgets, and dashboards. The habits to take away are three: in requirements review, treat "the per-call cost of this feature" as an acceptance criterion alongside latency and accuracy; when writing prompts, put the output length into the constraint so cost is designable at the source; and run every new feature on a small traffic slice for a few days, read the real input/output split in usage, and only then decide to scale or to optimize first.

## About the demo data

The token counts, rates, and amounts on these three bills are illustrative teaching data: input ¥4/M, output ¥16/M, and cache hits billed at 1/10 of the input rate are all example terms, not any vendor's quote; "100k calls/day over a 30-day month" is a constructed scale assumption. Per-call cost is computed as "input tokens × input rate + output tokens × output rate", and the "input cost" card shows the input-side quick math for the selected group. Real prices live on each vendor's official pricing page.
