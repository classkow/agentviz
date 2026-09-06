---
title: "Cost Engineering: Caching and Budgeting"
module: "G"
order: 2
description: "Prompt caching turns repeated full-price prefixes into discounted billing: the hit rate decides the savings, byte-for-byte stability decides the hits, and budgets plus observability keep the bill sane."
sources:
  - "https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching"
  - "https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/prompt-caching"
reviewed_at: 2026-09-06
draft: false
demo: "g02-cost-engineering"
component: "token"
---

E05 covered the billing formula and ranked the levers, with caching first. This lesson expands caching from "a move" into "an engineering practice": the before-and-after bill (on the anatomy bench above), the economics of hit rates, what deserves a seat in a stable prefix, and finally budget guardrails and cost observability. The goal is singular: keep the bill predictable in the face of redesigns and growth.

## The bill before and after caching

The demo's constructed scene: a support agent whose every request carries a 4000-token stable prefix — system prompt 1200, domain glossary 300, output format declaration 500, knowledge-base index 2000. Before the change, that prefix re-pays at full price on every request: at the example rate of ¥4/M, ¥0.016 per call of input, and at 100k calls/day that is ¥1,600/day, about ¥48,000/month. After the change, the prefix enters the cache with a 92% hit rate: 3680 tokens bill at one tenth, the remaining 320 at full price, for 368×1 + 320 = 688 effective billed tokens — note that "effective" does not mean "fewer sent": every token still travels, only the billing discounts. Per call drops to ¥0.002752, ¥275.20 a day, about ¥8,256 a month. Side by side: ¥39,744 saved monthly, roughly 83%. Not one line of business logic changed — only "what sits where in the request".

## The economics of the hit rate

Cache savings is not a linear game; the hit rate is the single lever. Write the arithmetic as a formula: effective billed tokens = prefix tokens × (hit rate × 0.1 + miss rate × 1). At a 92% hit rate the effective share is 16.4% (688/4000); let the hit rate fall to 50% and the effective share climbs to 55% — the savings more than halve. So every investment that lifts the hit rate pays: move the most volatile fields out of the prefix, merge fragmented instructions into stable paragraphs, and let similar requests share the same prefix shape. Traffic shape matters too: the more homogeneous the requests (batch calls of the same feature), the more stable the shared prefix; an application with a hundred faces (weekly reports today, order lookups tomorrow) splits its prefix naturally, and its cache gains should be discounted before evaluation — the right fix is splitting the entry points by feature so each product line owns one stable prefix. Lifecycle details also need checking per vendor: cache lifetime (minutes to hours; the first request after expiry re-pays the full write), whether the cache write itself costs extra (some vendors charge 1.25× on writes), and the minimum cacheable length — these parameters decide whether "the change is worth it" against your own traffic distribution, never by copying someone else's "we saved N percent".

## Byte-for-byte identity: what belongs in a prefix

The cache hit has an iron threshold: the prefix must be identical byte for byte. One character off, and the entire prefix re-pays at full price. Read backwards, this iron law defines "what deserves a seat in a stable prefix": the system block, format declarations, domain glossaries, knowledge-base indexes — inherently stable content, legal residents; timestamps, usernames, session IDs, random numbers, per-request retrieval results — any inch of these mixed into the prefix kills the cache by that inch. The classic accident is concatenating a timestamp or user info into the system prompt — the prefix changes every request and the cache exists in name only. The right posture is layering: stable content first, changing content after, severing "the unchanging skeleton" from "each request's flesh". The demo's third group lists invalidation scenarios in its note: switching models, rewording the system block, reordering the knowledge base — all rebuild the cache from scratch; touching the prefix is a priced operation, so check its price before you touch it.

## Budgets and rate limits: guardrails for the bill

Cost engineering is not only about saving; it is about preventing runaway. Budget guardrails come in three layers: per request (a cost ceiling on a single call — over-long inputs rejected outright), per user (a daily quota per user — containing single-point abuse), and global (daily/monthly total budgets — automatic degradation or alerts near the threshold). The three layers are tuned with different strictness: the global budget is a hard gate (fires alerts, even service pauses), the user quota is a soft gate (degrades rather than refuses), the per-request cap is a technical gate (max_tokens pins it). The layers echo E05's "output cost cannot be known precisely in advance": precisely because per-call cost is stochastic, the guardrails must be hard ceilings and quotas, never "try to be frugal". The other face of budgets is the refusal policy: when a quota is hit — hard reject, degrade (switch to a smaller model), or queue — the choice belongs to the business, and degradation passes the evaluation set first (G01) to confirm the smaller model meets the bar; degrading below the bar costs more than overspending.

## Cost observability: see it first, optimize second

Every optimization presumes a decomposable bill: usage receipts from every call aggregated into a three-dimensional ledger — by feature, by user, by day. The dashboard's key indicators: the per-call cost distribution (mean and P95), the cache hit-rate curve (a sudden hit-rate drop is the most valuable alarm in cost engineering — it means someone touched the prefix), and token-usage trends (growth must map to a business action). Observability also catches "negative optimizations": a change that quietly doubles output length shows up on the bill before any user complains. E05's habit list now closes into a full loop: cost in the design, bill on the dashboard, attribution when anomalies appear — cost engineering is not a one-time project but a daily discipline that lives with the system.

## About the demo data

The prefix composition (1200/300/500/2000 = 4000), rates (¥4/M, cache hits billed at 1/10), hit rate (92%), daily and monthly bills (¥1,600/day → ¥275.20/day; ¥48,000/month → ¥8,256/month), and monthly savings (¥39,744, about 83%) on this ledger are illustrative teaching data — no vendor's quote, no real bill; "100k calls/day" is a constructed scale assumption. Cache parameters (lifetime, write surcharge, minimum length) differ per vendor; consult the official documentation.
