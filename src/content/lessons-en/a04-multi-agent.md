---
title: "Multi-Agent Orchestration"
module: "A"
readingMinutes: 4
level: intermediate
order: 4
description: "The orchestrator splits the task, workers execute with their own tools, results are synthesized and delivered; context isolation is both feature and risk, and single-agent-first is the evolution discipline."
sources:
  - "https://www.anthropic.com/engineering/built-multi-agent-research-system"
  - "https://www.anthropic.com/engineering/building-effective-agents"
reviewed_at: 2026-09-06
draft: false
demo: "a04-multi-agent"
---

A01's loop is one model spinning; this lesson wires several loops together: an orchestrator receives the task and splits it, workers execute independently with their own tools, and their outputs flow back to the orchestrator for synthesis and delivery. That is the orchestrator-workers pattern. The swim lane timeline above walks a three-worker research task: three tracks in parallel, one failure, one reassignment, one synthesis — the benefits and the troubles of multi-agent all appear in a single run.

## When multi-agent is actually justified

Cold water first: multi-agent is not "more advanced"; it is expansion with side effects, and it deserves to exist only if at least one of three conditions holds. One, context blowup: a single loop's window cannot hold all the intermediate products — dozens of retrieval results squeeze out everything else, and distributing them to workers to digest is the way out. Two, specialized division: retrieval, computation, and writing each need their own tools and prompts, which fight each other inside one loop. Three, parallel speed: independent subtasks run concurrently and wall-clock time divides by worker count. If none of the three applies, stay with a single agent — orchestration itself spends model calls, and the finer you split, the higher the coordination cost. Anthropic's engineering conclusion quoted directly: build the simplest thing first; multi-agent is the closing move, not the opening.

## The structure of orchestrator-workers

The pattern's skeleton is two layers of loops. The upper layer is the orchestrator: receive the task → call the model to produce a task decomposition → dispatch subtasks to workers → collect outputs → synthesize and deliver. The lower layer is the workers: each worker is a complete A01-style loop (its own LLM calls and tool set), only with its scope trimmed by the orchestrator. The dispatch itself deserves P01's structured-prompt treatment: goal, boundaries, output format, available tools — four items present, and the worker can run autonomously; a vague dispatch amplifies into wayward execution on the worker side. Decomposition quality decides everything: a good split makes subtasks independent with clean boundaries; a bad split hides dependency chains inside parallelism — worker B waits on worker A's result with nobody telling it, surfacing only as failure. The demo's orchestrator writes the split rationale into the event detail: three subtasks are mutually independent, each with its own tooling needs — that sentence should be explicitly writable for every split; if it cannot be written, the split was guesswork.

## Context isolation: feature and risk

Context isolation between workers is multi-agent's sharpest double edge. As a feature: each worker's window holds only its own task and intermediates, dozens of retrieval results crush nobody's context, and each worker's prompt can be written with extreme specialization — isolation buys depth. As a risk: workers cannot see the whole — they do not know what the other workers are doing or where their piece sits in the mission, so their outputs may duplicate or contradict each other, and at edge cases they go their own way. In the demo, when B fails, A can be reassigned to cover precisely because the orchestrator holds the global view — stitching and fallback are forever the orchestrator's duty; workers answer only for their own subtask.

## Failure propagation and responsibility

The demo's most instructive moment is B's failure handling: the benchmark tool timed out three times running, and B returned a failure report rather than invented data (T03's discipline holds in multi-agent too). On receiving the failure, the orchestrator has three options: re-dispatch B (when time and budget allow), reassign another worker to cover it (A already holds related context, so marginal cost is low), or degrade explicitly (mark the section as missing or second-sourced in the report). The demo combines the third and second. The deeper question is "who answers for the final result": workers own segments, but delivery responsibility sits with the orchestrator — it must review each output's credibility and write degradation decisions into the deliverable rather than letting failures slip silently into the report. Failure is the norm in multi-agent, not the exception: the more workers, the lower the probability of an all-green round, and the orchestrator's failure-handling ability is the system's floor. Worker output formats should also be fixed at dispatch time (JSON, field lists), or synthesis-stage stitching eats the time parallelism saved.

## Single-agent-first discipline

Compress this lesson into one engineering discipline: single agent first, multi-agent later, with data at every step. The upgrade signals are real ones — a single loop's context overflowing, a tool list so bloated the model picks the wrong tool, serial latency becoming unacceptable; the upgrade path is gradual — restructure the prompt first, then split into subtask sequences inside one loop, and only finally into true multi-worker. Anthropic's multi-agent research system reported its billing characteristic: multi-agent token consumption can run a dozen times that of ordinary conversation — parallelism and division buy speed and depth with money, and that bill should be cleared by evaluation and cost data (G01/G02) before it is paid. Watch the pitfalls too: worker count has a sweet spot past which coordination cost eats the gains, and "a big model orchestrating, small models working" is a common cost-structure optimization.

## About the demo data

The research task, worker split, failure and reassignment flow in the swim lane demo are illustrative teaching data, not real system logs; the orchestrator-workers structure, context isolation, and failure handling align with Anthropic engineering teams' public practice articles.
