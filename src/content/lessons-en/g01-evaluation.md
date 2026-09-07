---
title: "Evaluation before Shipping"
module: "G"
readingMinutes: 4
level: practice
order: 1
description: "Three sources for the evaluation set, three automated scoring methods, and full re-runs: changing a prompt changes a global variable, and only layered metrics catch regressions."
sources:
  - "https://github.com/openai/evals"
  - "https://docs.anthropic.com/en/docs/test-and-evaluate/develop-tests"
reviewed_at: 2026-09-06
draft: false
demo: "g01-eval"
---

R05 taught evaluation to RAG; this lesson points the camera at every AI application: how the pre-launch exam is written, graded, and used. Why does "clicking through a few examples by hand" not count as evaluation? Because it is unbounded: the examples clicked are cherry-picked, the blast radius of a change is invisible, and regressions are silent. The swim lane timeline above runs 50 constructed exam questions through three rounds: a v1 baseline, a regression caught mid-improvement in v2, and an all-green v3 — the complete life cycle of evaluation in one pass.

## Why hand-clicked examples are not evaluation

Manual sampling has three systematic blind spots. First, the samples are yours: people instinctively pick examples that look like they would pass, the hardest paths never enter the sample, and production incidents start precisely at the hard cases. Second, no baseline: without a fixed question set run repeatedly, "this version feels better" has no footing — feelings are not metrics. Third, no regression awareness: the prompt is a global variable, one change can break three things, and manual sampling only covers the neighborhood of the change while distant regressions stay invisible. Evaluation's essence is closing all three: a fixed question bank (reproducible), machine grading (quantifiable), and full re-runs (regression-aware). R05 covered RAG's two-level metrics; this lesson's framework holds for any prompt-driven application.

## The evaluation set: three sources and rot-free upkeep

A good exam draws its questions from three sources. Real cases: anonymized production tickets, representing the high-frequency paths where most traffic lives. Edge cases: long inputs, multi-condition requests, rare class combinations — the system's capability frontier. Adversarial cases: injection attempts, malicious inputs, questions the store cannot answer — the system's floor behavior. The demo's 50 questions split 30/12/8. Every question must carry a golden answer and a class label — unlabeled questions can only be graded by hand and never scale. One counter-intuitive discipline of question writing: the evaluation set must be isolated from the development set — examples you stared at while writing the prompt must not sit in the exam, or you have leaked the exam and the score flatters while production burns. The set also needs rot-proofing: as the product iterates, questions go stale (renamed fields, changed flows), so the evaluation set is reviewed with every version — a rotten grading standard is worse than no evaluation. On scale: a few dozen high-quality questions support a prompt-revision decision; hundreds are needed for a model-level change.

## Three automated scoring methods

Machine grading has three moves, ordered by determinism. Exact match: field values, enums, numbers compared directly — zero ambiguity, but only for closed answers. Rule validation: format (parsable JSON, compliant dates), length caps, required-field presence — cheap to write, wide in coverage, the backbone for structured tasks. LLM-as-judge: semantic equivalence and quality bands handed to a model — the most flexible, but the judge is itself a model with its own biases: a taste for longer answers, a fondness for certain phrasing, extra leniency toward its own style. So the judge must be governed: calibrated against human labels, its verdicts sampled for audit, sensitive classes cross-graded by multiple judges. The demo assigns clear roles: exact match for field values, rules for format and required fields, the judge for answer quality — no single method rules all.

## Regression testing: full re-runs are the discipline

The demo's core plot is the regression caught in v2: the total rose from 0.82 to 0.88 while the returns class fell from 0.9 to 0.7 — the format of the newly added billing examples got imitated by the returns class, dropping a required field. Two lessons. First, prompt changes demand full re-runs: all 50 questions, none skipped, because the prompt is a global variable whose blast radius cannot be statically bounded; "test only the changed class" assumes the change is local, and prompts are precisely not. Second, metrics must be layered: an evaluation reading only the total lets this regression walk — the glow of +6 points easily hides a −20-point warning in one class. The report format is therefore fixed at two layers: overall pass rate plus per-class error distribution, output in full on every run. The attribution discipline of changes (P04's one-change-at-a-time) starts compounding under evaluation: single-variable change + full re-run + layered comparison, and any quality movement locates its specific cause within half an hour.

## From evaluation to shipping

Evaluation's closing act is the ship/no-ship decision. The engineering convention is gates and red lines: overall pass rate no lower than baseline, no class down more than a threshold versus baseline (the demo's red line is 5 points), zero tolerance on safety-critical classes. Versions that pass go to gray release: 5% of traffic first, watching whether live metrics agree with the evaluation's verdict, then scaling up — when evaluation conclusions and production behavior diverge for long, suspect the exam's representativeness first. The economics of evaluation deserve their own line: a full 50-question run (50 calls plus grading) costs far less than a single production incident — that is the economic essence of "the exam before shipping": trading an affordable, certain cost for an unaffordable, random one. Once running, the system's role expands from "pre-launch exam" to "the health center": model swaps, prompt tweaks, guardrail rollouts — all sit the exam first; G02's caching change and G03's guardrail gray release both treat "evaluation re-run passing" as the gate. Evaluation is where the G module starts, and the final executor of "let the data speak" across this whole course.

## About the demo data

The question composition (30/12/8), the three rounds' scores (0.82→0.88→0.94), per-class scores, and the regression cause in the swim lane demo are illustrative teaching data, not real evaluation output; the set composition, scoring methods, and regression discipline align with the public practices of OpenAI evals and Anthropic's evaluation documentation.
