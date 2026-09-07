---
title: "Human in the Loop"
module: "A"
order: 6
description: "Spending money, modifying external data, outward sends, and irreversible operations must pass a human; the approval gate intercepts before execution, and rejection is input that changes the trajectory."
sources:
  - "https://www.anthropic.com/engineering/building-effective-agents"
  - "https://www.anthropic.com/engineering/claude-code-best-practices"
reviewed_at: 2026-09-06
draft: false
demo: "a06-human-in-loop"
---

An agent's autonomy scales with its capacity for damage: a loop that can work on its own can also blunder on its own. Human in the loop is not the courtesy of "asking the user a bit more often" — it is an engineering structure, the approval gate: intercept before the action executes, hand the human judgeable information, and turn the human's decision (including rejection) back into the system's input. The swim lane timeline above walks one low-risk and one high-risk action: the low-risk one passes the allowlist untouched, the high-risk one is intercepted, rejected, revised, sent through the gate again, and finally completes under human approval.

## Which actions must pass a human

The gate is sited by risk, not by frequency. Four classes of actions must in principle pass a human: spending money (orders, payments, high-volume operations), modifying external data (dropping tables, changing configuration, overwriting files), outward sends (email, messages, announcements — nothing sent can be unsent), and irreversible operations (everything without an undo key). What the four share is irrecoverable cost: mistakes you can fix are low-risk; mistakes you cannot fix are high-risk. In the demo, delete_test_rows matches the allowlist (test_ prefix only, capped at 1000 rows) and passes automatically, while send_report to the whole company is intercepted — one task, two risk classes, two paths. The allowlist is the gate's other half: listing low-risk actions explicitly for auto-approval keeps the gate from turning every action into a user's chore — approving everything means nobody reads approvals, and the gate exists in name only.

## The interception point is before execution

Event 6 of the demo quantifies this: the interception point must sit before the action executes — when send_report is parked, nothing has happened in the external world. That is the essential difference between a gate and "rollback afterwards": rollback always has unrecoverable cases (the email already read), while pre-execution interception costs nothing when it fires. Engineering-wise, the gate is middleware sandwiched between the agent loop and the execution layer: every `tool_use` request passes through it first — allowlisted requests pass and get logged; non-allowlisted ones pause the loop, generate the approval request, and wait for the human's decision. The pause must pause thoroughly: the loop hangs and subsequent actions queue, rather than intercepting only the current action and releasing the rest — later actions may depend on the earlier high-risk one, and only a full pause preserves a consistent scene.

## Approval requests must be judgeable

What you show the user decides the quality of approval. "Confirm send_report?" is a useless request — no parameters, no blast radius; the human can only sign blind. A judgeable request carries four things: the action name with full parameters (who receives it, what the content is), the blast radius (how many people receive it, how many rows change, how much it costs), the agent's reasoning (why it believes this should happen), and deviation from safe defaults (which parameters differ from convention). In the demo, the gate surfaces "recipients = whole company", which is exactly what lets the user catch "wrong — operations only". Information density should be designed on purpose: when parameters run long, surface the risk items (row caps, deletion scope, send range) and fold the rest — the request must read in one screen; unreadable approvals do not get read. The approval surface is the most underrated component of agent systems: it is not a dialog box, it is a decision-support page — with structured information, approval stops being a rubber stamp.

## Rejection is also input

The demo user's rejection is not an endpoint but corrective input: "Wrong recipients — operations only; and the numbers need a manual check first." The sentence re-enters context as an Observation, the agent revises the plan, changes parameters, and reapplies — the trajectory changes. Designing rejection as a feedback channel means every human veto teaches the system the right direction; designing it as a dead end (reject and terminate) teaches users to resent "doing it all over again". Rejection reasons can be structured further: let the user pick a class — "wrong parameters / shouldn't be done at all / shouldn't be done now" — plus a note, and the agent's revision becomes far more precise: "shouldn't be done" means a different route, "not now" means a different time; mixed together, they only earn a fourth pointless request. The paired piece is the evolution of thresholds and allowlists: the same action class approved repeatedly is a signal to allowlist it; rejected repeatedly is a signal that the prompt or task definition is wrong — approval data is itself evaluation material (G01's thinking). But draw one line clearly: approval is not liability immunity. The gate records who approved, when, and on what basis — logs and explainability are the prerequisites of audit; approval shares responsibility, it does not transfer it.

## The gate inside the defense-in-depth combo

The gate is not a standalone insurance; it holds a position in layered defense: guardrails (G03) block content risk, the gate (this lesson) blocks action risk, evaluation (G01) blocks quality risk. The three cover different failure surfaces: guardrails and gates are deterministic filters before and after the model, evaluation is the regression net before launch. The gate also carries an underrated team value: approval records are the most authentic hard-case collection — every rejection marks "what the agent currently gets wrong", closer to the real failure distribution than an imagined test set. The common engineering sequence: logs first (visibility), then the allowlist gate (containment), content guardrails last as needed — do not open every gate on day one; friction that large teaches users to bypass the system, which is worse than no gate.

## About the demo data

The task, the allowlist rules (test_ prefix / 1000-row cap), the deleted row count (312), and the approval exchange in the swim lane demo are illustrative teaching data, not real system output; the "intercept-before-execution" and "rejection-as-feedback" structures align with the public recommendations of Anthropic's engineering practice articles.
