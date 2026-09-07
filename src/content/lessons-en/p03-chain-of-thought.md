---
title: "Chain of Thought"
module: "P"
readingMinutes: 4
level: intro
order: 3
description: "On multi-step tasks, reasoning before answering beats answering outright; reasoning in context can be checked segment by segment, at the price of longer, pricier output."
sources:
  - "https://arxiv.org/abs/2201.11903"
  - "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/chain-of-thought"
reviewed_at: 2026-09-06
draft: false
demo: "p03-chain-of-thought"
---

The same multi-step word problem, answered outright versus answered after step-by-step reasoning, differs measurably in accuracy — one of the most thoroughly verified phenomena in prompt engineering (Wei et al., 2022, the Chain-of-Thought paper, provided the systematic evidence). The swim lane timeline above runs the same problem twice: answered directly, it fails silently; answered in steps, every step is checkable. This lesson explains where the gap comes from, what it costs, and when not to use it.

## Answering outright vs drafting first

The demo problem has three dependent arithmetic steps: discount, add shipping, tax the amount actually paid. Call A, demanding the answer directly, returns ¥1,071.80 — wrong because the tax base dropped the shipping, and invisibly wrong: with no intermediates, you cannot even ask which step failed. Call B, asked to go step by step, returns ¥1,074.60 with all three intermediates on the record, each verified. This is no cherry-picked fluke: multi-step arithmetic, multi-condition rule application, and logic chains systematically fail more often under "answer directly", and the failure mode is constant — quiet errors. For engineering, quiet errors cost more than loud ones: loud errors get caught by validation, quiet ones enter the database and surface only at reconciliation downstream.

## Why "step by step" works

The mechanism has two layers. First: once intermediates are written into context, every subsequent generation is conditioned on them — step ② sees the 960 written by step ①, so step ③ cannot misremember it; literals in context are far more reliable than quantities "in the head". Second: writing the reasoning out forces segment-by-segment self-checking — with every line written, the model runs a consistency check against the preceding text; "writing it out" is itself the correction opportunity. In the demo, the decisive step — "the tax base includes shipping" — is skipped in the direct version but explicitly written and self-checked in the stepwise version; that is exactly where both mechanisms meet. The CoT paper summarizes it as: giving the model room to reason, complex-reasoning performance improves as the steps unfold. It does not make the model smarter — it hands it a scratchpad lying open on the desk.

## The cost of reasoning tokens

The scratchpad is not free. The demo's bill comparison: the direct answer is about 40 output tokens, the CoT about 180 — more than four times the output cost, with generation time rising in step. E05's billing logic applies directly: output rates run several times input rates, and every draft token of CoT bills at the output rate. So CoT is a trade: a deterministic rise in cost, exchanged for "correctness moving from a lottery to something verifiable". On multi-step arithmetic, logical inference, and rule-application tasks the trade usually pays — a cheap wrong answer is worth zero — while on single-step tasks it is a pure loss, which is the next section's subject. There is also a middle path: run CoT for the internal decision chain and deliver only the summarized conclusion to the user — reasoning stays backstage while the accuracy is still banked.

## When CoT is not needed

On single-step tasks CoT is a liability: rewriting, translation, format conversion, simple classification — none has a middle chain worth unfolding, and demanding "step by step" can push the model into performative reasoning — inventing steps to look like it reasoned, ending with the same answer as a direct request on a longer bill. The test is one line: does the task have a dependency chain that cannot be resolved in one step? If yes, grant the scratch space; if no, say "give the result directly". A second boundary is streaming: the CoT process should not stream verbatim to the end user — the user wants the answer, not the model's monologue; the application layer must separate draft from conclusion. CoT also has a team dimension: a reasoning chain written into context is the cheapest debugging venue there is — when the answer is wrong, one read of the intermediate steps usually tells you whether the problem is an ambiguous question, conflicting constraints, or model capability — far faster than black-box retrying.

## From prompt to built-in reasoning

The evolution of CoT is already written into newer models: reasoning no longer depends on pleading in the prompt but is built into the model — reasoning tokens moved inside (in some products presented as a separate reasoning channel), and the draft no longer occupies your output budget. That does not retire this lesson: reasoning-native models still benefit from clearly stated problems (P01) and demonstrated stepwise structure (P02), and the billing of reasoning tokens has changed — billed as output, usage not predictable in advance (E05's estimation problem), so budget monitoring must follow. The core judgment is unchanged: the scratchpad lives either in the output you pay for or in the model's built-in channel — either way it is not free; whether paying for reasoning to buy accuracy is worth it, evaluation always gets the final word.

## About the demo data

The problem, the wrong answer ¥1,071.80, the correct answer ¥1,074.60, and the output token counts (about 40 vs about 180) in the swim lane demo are illustrative teaching data, not real model output; the direction of the direct-vs-CoT accuracy gap aligns with published research, while specific numbers vary by model and task.
