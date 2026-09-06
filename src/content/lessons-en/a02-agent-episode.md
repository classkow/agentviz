---
title: "Replaying a Full Task Episode"
module: "A"
order: 2
description: "One episode of a task in its real shape: rounds of thought, tool calls, and observations, up to a delivered answer with an evidence chain."
sources:
  - "https://www.anthropic.com/research/building-effective-agents"
  - "https://docs.anthropic.com/en/docs/build-with-claude/tool-use"
reviewed_at: 2026-09-06
draft: false
demo: "a02-episode-replay"
---

The previous lesson, A01, handed you the abstract structure: a single-call model wrapped in a loop and handed tools. This lesson swaps the structure for one concrete episode of a task. The demo above the prose is a complete execution trace — 5 lanes and 13 events, from the user stating a goal to the summary being delivered — playable beat by beat, steppable forward and back, or browsable by clicking any row. While watching, keep your eyes on two things: who decides the next step, and who executes it.

## From a single call to a full task: what an episode is

The pipeline in E01 is one-shot: a context goes in, a text comes out, and when the request ends everything resets. But a task like 「research fatigue data for U-bolts and write a one-page summary」 rarely gets an answer from a single call — it has to search first, read, and only then decide what else to look for. An episode is the term for exactly this shape: it starts when the user states a goal and ends when the system delivers or gives up, and in between the model is called for several rounds, tools are executed several times, and results are fed back several times. What powers it is not a smarter model but the same stateless model invoked repeatedly by a loop. The demo's 13 events are every beat of this episode, taken apart.

## The loop's three beats: thought, action, observation

The same rhythm repeats throughout this episode — the ReAct pattern from A01: thought, action, observation. A thought is an ordinary chat call, no different from everyday Q&A except that the output is not an answer but a decision — the demo's three 「thinking calls」 produce the retrieval plan, the revision plan, and the summary structure respectively. An action is the structured call request the model writes out: a function name plus a JSON of arguments; the actual execution happens on the client. Anthropic's documentation is blunt about this step: the model only produces tool_use blocks, the code runs on your side, and the result comes back from you as a tool_result. An observation is the execution result fed back into the context in full, becoming the input to the next round of thought.

## Five decision points in one episode

Count them against the demo — five points in this episode were decided by the model itself: task decomposition (a1, a2 — splitting one sentence into retrieval and summarization), stale-data triage (a5, a6 — spotting that the 2019 legacy catalog cannot be cited as-is), plan revision (a6 into a7 — noticing a missing duty-condition data sheet and scheduling one more fetch), summary structure (a9 — choosing to lay out the duty-condition comparison before the gaps), and exit timing (a13 — judging the data sufficient and stopping). Not one of these five is a pre-written if-branch — that is precisely the line Anthropic draws between workflows and agents. And at every decision point, the only raw material the model holds is the context accumulated up to that round.

## How context grows inside the loop

A single call has exactly one input; in an episode, round k of thinking must resend the entire conversation of rounds 1..k-1, because the model is stateless. So no observation comes free: the 5 retrieval hits and a full page of curve data all stay in the context, and the per-round input token count grows roughly quadratically, with cost and latency climbing alongside. The subtler hazard of a long context is attention — the thicker the context, the harder it is to guarantee the model's grip on early content, showing up as repeated actions or forgotten data already retrieved. The engineering responses to these runaway precursors are truncation and compression (E04) plus hard guardrails (A07).

## Stopping the loop: stopping conditions and auditability

A loop does not converge on its own; stopping takes two things. First, a task-completion check: the model's round output is no longer an action request but the final answer — like a10 in the demo. Second, an external hard gate: a round cap, time and cost budgets, human confirmation before high-risk actions — Anthropic explicitly recommends giving agents a maximum iteration count so they cannot spin forever. The demo's a13 belongs to the first kind: the plan ran out and the answer is in. The second kind must be in place in any real system too; this episode simply never reached that ceiling. The other takeaway sits in a11: archiving each round's citations and the discarded data as by-products is what lets this episode survive human review — and what keeps 「multi-round autonomy」 from being just 「multi-round unexplainability」.

## About the demo data

The demo above is illustrative teaching data, not a recording of a real run: the U-bolt load-life numbers, the hit counts, and the years are constructed examples — do not cite them as engineering data. The event shape does align with a real call chain — three independent chat calls, two client-executed tool requests, and two observations fed back — with field semantics matching the tool_use / tool_result round trip in Anthropic's tool-use documentation. The writing standard is the same as E01's and A01's: the numbers are constructed; the structure is real. Treat this episode as a shape reference; if you actually use it, verify every number against your own retrieval sources.
