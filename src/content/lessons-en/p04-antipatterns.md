---
title: "Prompt Antipatterns"
module: "P"
readingMinutes: 4
level: intro
order: 4
description: "Politeness and threats do nothing, overloaded instructions silently drop items, negative instructions lose to positive ones; the repair methodology is one change at a time with kept comparisons."
sources:
  - "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview"
  - "https://help.openai.com/en/articles/6654000-best-practices-for-prompt-engineering-with-the-openai-api"
reviewed_at: 2026-09-06
draft: false
demo: "p04-antipatterns"
---

The previous three lessons covered "what to do"; this one covers "what not to do" — prompt antipatterns deserve learning before the positive techniques because they feel so natural: be a little polite, pack the requirements into one breath, forbid what you don't want. They share one more trait: when they misbehave, nothing errors or crashes — output just quietly degrades, which is exactly why a named checklist is needed. The swim lane timeline above stages three high-frequency antipatterns: an overloaded instruction dropping two of five items, a negative instruction being violated, and a positively rewritten contrast finishing clean.

## Politeness and threats do nothing

"Please be sure to", "this is a very important task", "there will be serious consequences if you fail" — such sentences are prompt writing's most common redundancy. Alignment training does make the model respond graciously to courteous requests, but a gracious attitude is not higher capability: alignment shapes the style of the response, not accuracy on the task, and politeness or threats contribute approximately nothing to the latter while steadily burning tokens — the input-side tokens re-paid on every request ([E04](/en/learn/e04-context-window/)/[E05](/en/learn/e05-cost-breakdown/)'s billing logic applies directly). Swap "please be extremely careful" for one concrete constraint ("fill missing fields with null") and compare. The same verdict covers "jailbreak-style stress testing" — working to bypass the model's safety refusals may satisfy curiosity in development but contributes nothing to production quality: production wants stable behavior on normal requests, which is the territory of lesson [G01](/en/learn/g01-evaluation/) on evaluation.

## Overloaded instructions: ten tasks in one sentence

The demo's v1 packs five demands into one sentence; the evaluator scores 3/5: the bullet list is missing and the body runs 112 words against the 50-word cap — and the model never announces the omissions, it just quietly does less. The mechanism is no mystery: the more parallel demands inside one sentence, the smaller the attention share each one gets, and requirements at the end of the sentence are the first squeezed out; worse, which item is dropped is unstable — this time the bullets, next time the word count. The same prompt being sometimes right and sometimes wrong is precisely what hurts engineering most. The fix is listing: one requirement per line, numbered, so every task holds its own syntactic position. Listing is the same move as [P01](/en/learn/p01-structured-prompts/)'s delimiters — structure replaces attention to guarantee "everything gets read". When requirements are genuinely complex, split into multiple calls rather than stuffing one paragraph: one thing per round, and the chain still completes the flow.

## The negative-instruction trap

"Do not use passive voice" executes markedly worse than "write everything in active voice". A negative instruction demands an extra conversion — think of the forbidden form first, then suppress it — and the suppression implied by "do not" does not always land; the demo's v1b dutifully outputs passive voice anyway. Rewritten positively, the model generates straight toward the target, skipping the think-then-suppress step entirely. Positive conversion is a practicable skill:

- "no long paragraphs" → "at most two sentences per paragraph"
- "do not fabricate" → "fill unknown for information absent from the material"
- "be less verbose" → "keep the body within 50 words"

The rule: paint the picture you want, not the inverse of the picture. Examples ([P02](/en/learn/p02-few-shot/)) and positive instructions are two faces of one philosophy: give templates, not bans. There is an exception — safety-red-line bans ("never output the customer's phone number") should still be written — just never expect a single "never" to carry the wall; guardrails ([G03](/en/learn/g03-guardrails/)) are the final defense.

## Stale and mismatched examples

P02 called examples a behavioral spec; this lesson adds their shadow: specs go stale. Leave old field names in the examples after a product redesign, and the model faithfully emits the deprecated format; borrow examples from one domain to serve another, and the model imitates a chimera. Both problems are nearly invisible in single-session debugging — they hide in the time where "the prompt never changed while the world kept changing", surfacing only at downstream systems or evaluation. The countermeasure is managing prompts like code: examples under version control, reviewed in step with product documentation, changes on the record. Everything placed inside a prompt — examples, field lists, domain glossaries — needs an owner accountable for its freshness.

## The methodology of prompt repair

The value of an antipattern list is not memorizing entries but imposing discipline on prompt repair: change one thing at a time. A "triple change" — structure, examples, and constraints at once — may improve things, yet you cannot tell which change worked, and the next regression has nothing to roll back to; that is a deeper pit than poor performance. Keep before/after records for every change: old prompt, new prompt, both outputs, evaluation results — four items archived so changes link to effects; once G01's evaluation set arrives, these records automatically become the baseline for regression testing. The discipline mirrors code review: a prompt is a living document edited repeatedly, and tuning a prompt without versions and comparisons is writing code in a repository without version control. The [P module](/en/learn/p01-structured-prompts/) now closes its toolbox — structure (P01), examples (P02), drafts ([P03](/en/learn/p03-chain-of-thought/)), discipline (this lesson) — and the [R module](/en/learn/r01-rag-pipeline/) changes the battlefield: open-book exams for models.

## About the demo data

The product copy, rewritten outputs, and evaluation results in the swim lane demo (3/5, 112 words, 48 words, etc.) are illustrative teaching data, not real model output; the antipattern behaviors align with consensus advice in both vendors' official prompt guidance, and specific outputs vary by model version.
