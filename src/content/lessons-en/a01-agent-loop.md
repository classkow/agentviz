---
title: "An Agent = LLM + Loop + Tools"
module: "A"
order: 1
description: "Reduce an agent to a plain structure: a single-call model, wrapped in a loop, handed a few tools."
sources:
  - "https://www.anthropic.com/engineering/building-effective-agents"
  - "https://arxiv.org/abs/2210.03629"
reviewed_at: 2026-09-06
draft: false
demo: "a01-agent-loop"
---

「Agent」 is a word wrapped in marketing mystique, but taken apart the structure is startlingly plain: a model that only makes single calls, wrapped in a loop, handed a few tools. This lesson assembles that structure from the fewest possible parts. In Building Effective Agents, Anthropic sorts these systems into two tiers: workflows (the model-call path is hardcoded by you in advance) and agents (the model dynamically decides what to do next and for how long) — this lesson is about the latter, and about how the parts difference between the two is really just one loop.

## The model is a single call

Nail the model down first: one API call is one pure function — a context in, a text out, nothing more. It does not 「think it over」, does not ask follow-ups, has no memory across requests; if you do not resend the history, it behaves as if nothing happened before. In Qt terms, it is a stateless slot function, not an object with an event loop. This must be pinned down, because every appearance of 「autonomy」 later on is wrapped around that single call by external code — the model itself knows nothing about it.

## Give the model a loop

The agent's first part is not a smarter model but a while loop: call the model → inspect the output → if the model requests an action, execute it and feed the result back into the context → call again. The loop's exit condition is decided by the model's output — when it produces a final answer instead of an action request, the loop ends. What we call 「completing a task autonomously」 is, at bottom, this loop turning a few more rounds. Anthropic calls this structure an agent loop: the model charts its route inside the loop based on its own outputs and the environment's feedback, with neither the step count nor the path fixed in advance. Engineering practice pairs it with a termination condition — a max-iteration count or a budget ceiling — to guard against never converging.

## ReAct: Thought–Action–Observation

What shape should each turn of the loop follow? ReAct (Yao et al., 2022) supplied the answer that has been widely reused ever since: every turn has three fixed beats. The model first emits a Thought — its reasoning about the current situation and its intended next step; then an Action — a pick from the tool list together with arguments; we, as the runtime, actually execute the action and feed the result back into the context as an Observation, starting the next turn. The Thought is the key invention: having the model write its reasoning out explicitly and choose actions accordingly is far more accurate than emitting actions bare, and it leaves an auditable decision trail. This three-beat pattern needs no new training — prompting and parsing alone run it on ordinary chat models.

## One full task replay

Take 「check tomorrow's Beijing weather and judge whether it suits a picnic」 and walk it through. Turn 1: Thought 「I need tomorrow's weather data」 → Action `get_weather(city="北京", date="明天")`; the Observation returns 「sunny, 14~26℃, light breeze」. Turn 2: Thought 「I have the weather; still need the picnic judgment」 → Action `thinking` (or plain reasoning, no external call); the Observation is the model's own analysis. Turn 3: Thought 「enough information」 → the final answer 「good for a picnic; mind the morning–evening temperature gap」, and the loop exits. Three turns, two tool calls, and the path was decided on the spot by the model — had the weather API errored, it might have detoured into historical data. That is exactly where the loop beats a fixed pipeline.

## Runaway, and guardrails

The loop's dark side is runaway. Three common failure modes: the dead loop — the model keeps calling the same tool that is doomed to fail; error accumulation — a wrong Observation on turn 3 poisons every judgment after it; context explosion — every turn appends to messages, and after dozens of turns token cost and latency both run away. Guardrails are therefore mandatory parts, not options: a hard maximum-iteration count, token/cost budget ceilings, human confirmation before high-risk actions (deleting data, sending email), and length truncation of tool results. Anthropic's advice is to start with the simplest structure that works — prefer a workflow whenever one suffices — and when an agent is truly needed, treat the guardrails as first-class citizens, every bit as important as the loop itself.

## About the demo data

The demo above is illustrative teaching data, not a recording of a real run: the weather readings and the tool names are constructed for the lesson. The event shape, though, mirrors a real call chain — ordinary chat calls producing decisions, client-executed tool requests, and observations fed back into context, matching the tool_use / tool_result round trip described in Anthropic's tool-use documentation. Constructed numbers, real structure.
