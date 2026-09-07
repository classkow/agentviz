---
title: "The Runaway Experiment: a Loop with no Brakes"
module: "A"
readingMinutes: 4
level: intermediate
order: 7
description: "With every guardrail removed, a loop fails in three forms — spinning in place, goal drift, and cost hemorrhage; the full guardrail family cashes in A01's foreshadowing."
sources:
  - "https://www.anthropic.com/engineering/building-effective-agents"
  - "https://arxiv.org/abs/2210.03629"
reviewed_at: 2026-09-06
draft: false
demo: "a07-runaway"
---

A01 planted a seed: "without a stopping condition, the loop keeps turning." This lesson cashes it in — not as an abstract remark but as an experiment: remove every guardrail, let a loop genuinely run away inside a controlled environment, and record each round's state and spend. The swim lane timeline above is the experiment's record: 12 idle rounds, ¥0.86 burned, task completion at 7%, three runaway forms taking the stage in turn, until the circuit breaker pulls the plug.

## The setup: dismantling the guardrails

The environment is a deliberate reductio: round cap = none, time budget = none, cost budget = none, per-step audit = off, circuit breaker = disabled — every layer of guardrail recommended by A01 and T03 is explicitly removed. The task is trivial: "load this dataset into the store." Trivial by design: runaway needs no complicated task for soil — one connection-pool fault plus one brakeless loop is enough. The observation methodology deserves stating first: record each round's state (what it did, whether it succeeded) and spend (this round's cost, cumulative cost), and keep a human able to pull the brake at any moment — without these two premises, the runaway would not even be observable.

## Runaway form one: spinning in place

Round 1: the model chooses bulk_insert for a one-shot write — the plan itself is sound. Failure 1: connection pool exhausted. The trouble lives in the error message — "connection pool exhausted" tells the model nothing actionable (wait? switch batch size? shrink the batch?), so the model can only retry verbatim. Failure 2 and failure 3, parameters unchanged, cumulative spend crawling from ¥0.04 to ¥0.16. That is runaway form one: repeating the same failing action. T03 gave the antidote: feed back the verbatim error with actionable clues ("try a smaller batch" is four words of salvation); the experiment has none of that, and the model butts against the wall in the dark. The detection signature of spinning is "zero difference between consecutive rounds' request parameters" — with per-step audit present, round 3 would already raise the alarm. A nastier variant exists: the model rephrases the same request between failures — semantically identical, literally different — which simple equality checks miss and requires semantic-level duplicate detection.

## Runaway form two: goal drift

Round 5: the model starts "thinking of something" — it switches to row-by-row inserts, direction still correct, progress reaches 7%, then stalls again. Round 7 brings the qualitative shift: the model decides to "tidy up the unrelated reports first". The task was loading data; it is now doing report cleanup — runaway form two: goal drift, straying further while unaware. The mechanism is no mystery: the loop's "goal" is just text in context, the model reinterprets the task every round, and the frustration of early failures (visible in context as a string of failed Observations) pushes it toward easier neighboring tasks. Drift's greatest danger is that every step looks reasonable — the audit log shows no error, only a quiet, diverging trajectory. The countermeasure: re-pin the original task into context every round ("always about: load the data") and check each round's output for task relevance — turning drift from "discovered in the post-mortem" into "intercepted in the very round".

## Runaway form three: cost hemorrhage

By the forced exit at round 12, cumulative spend is ¥0.86 with task completion at 7%. No single round is expensive, but "paying every round while progress stands still" is hemorrhage — runaway form three. It is the financial projection of the first two forms: spinning and drifting both draw down budget. The demo's deliberately re-enabled breaker force-quits on a dual condition: ≥10 consecutive failures or spend over ¥0.5 — either alone should fire, and here the spend condition arrives first. The ¥0.86 tuition buys one conclusion: a loop without a budget cap is handing a credit card to an intern who dreams.

## The guardrail family and the post-mortem

The post-mortem names each guardrail layer: round cap (bluntest but most reliable — 12 rounds should have stopped long before), time budget (prevents long-tail idling), cost budget (in this experiment, ¥0.5 would have cut the loss by forty percent), per-step audit (round 3's verbatim retry should have raised the alarm), and the circuit breaker (the final gate that auto-stops everything). Five layers, each guarding a different way to die, all cheap to implement — their absence was paid for by the experiment's ¥0.86. Guardrail settings are not guesses either: the round cap comes from the round-count distribution of normal tasks (P99 plus margin), the cost budget from expected per-task bills times a fault-tolerance coefficient — thresholds grown out of evaluation data have discriminating power; made-up thresholds are either decorative or constantly false-positiving. The closing returns to A01's sentence: a loop must have stopping conditions, and guardrails matter as much as the loop. The methodology of runaway experiments is now complete: run the baseline with all guardrails on, close them layer by layer to observe failure modes, book every round, and keep a human able to pull the brake — knowing how the system dies is knowing where to install the guardrails.

## About the demo data

The task, round count (12), cumulative spend (¥0.04→0.08→0.12→0.16→0.86), completion (7%), and breaker conditions (≥10 consecutive failures or spend over ¥0.5) in the swim lane demo are illustrative teaching data, not real system logs; the three runaway forms and the guardrail inventory align with public engineering practice.
