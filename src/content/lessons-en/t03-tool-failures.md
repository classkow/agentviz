---
title: "Tool Failures and Retries"
module: "T"
order: 3
description: "Failure is the norm: is_error lets the model know it failed, verbatim error text enables self-correction, and backoff with a retry cap is the client guardrail."
sources:
  - "https://docs.anthropic.com/en/docs/build-with-claude/tool-use/handling-tool-use-errors"
  - "https://docs.anthropic.com/en/api/errors"
reviewed_at: 2026-09-06
draft: false
demo: "t03-tool-failures"
---

The previous two lessons had smooth sailing; the real world is less polite — timeouts, bad parameters, denied permissions, and rate limits take turns on stage. This lesson is dedicated to failure: the swim lane timeline above walks a genuinely troublesome task — the first call's parameters rejected by the validator, the model fixing and retrying successfully, the second call hitting a rate limit, and the 4th attempt finally landing after backoff. By the end, "failure" is no longer an exception branch but a first-class citizen of this chain.

## Failure is the norm

Tool calls fail in at least four ways: timeouts (a downstream service is slow or down), bad parameters (the model's input violates the schema), denied permissions (the application lacks access to that data), and rate limits (429 — too fast or out of quota). Each class has its own posture: timeouts belong to the client's retry policy, bad parameters go back to the model for self-correction, permission denials are pointless to retry — reroute or escalate — and rate limits call for backoff and waiting out the window. If a single call fails only 2% of the time, a 20-step task has roughly a one-in-three chance of at least one failure somewhere along the way — as steps accumulate, failure turns from "accident" into "certainty". So the engineering question is not "how do we avoid failure" but "how does the system behave when it happens": does it hang, does it swallow the error silently, or does it turn the failure into input for the next step?

## is_error: let the model know it failed

The most important switch when replying with a failure is is_error=true. It guards against two kinds of well-meant harm: replying an empty result — the model believes the query succeeded but found nothing and starts inventing reasons; and faking success — wrapping the failure as "operation completed", after which the model keeps reasoning in a fictional world and every following step stands on a lie. is_error tells the model plainly that "this request failed", and only then does self-correction have a chance. The other essential is verbatim error text: put the validator's or downstream service's original error message into content instead of a self-written "something went wrong" — the verbatim text carries every clue the model needs, and a line like "expected YYYY-MM-DD, got 09/07" is already half the correct answer. Error prose deserves real attention too: errors written for humans aim at friendliness, while errors written for models should aim at actionability — state the expected format, list the legal values, say which kind of retry makes sense, and the model's self-correction rate climbs with the prose quality.

## The model's three reactions

Given sufficient failure information, the model's behavior falls into three patterns: fix the parameters and retry (the error message states the format requirement, so it complies), switch tools (this endpoint is down; try another route to the same data), or give up and explain (after two retries it tells the user where it is stuck and what it tried). All three are reasonable, and the first two need no branch in your code — that is precisely the value of verbatim errors: the self-correction logic runs on the model side, and the application only relays faithfully. Worth stressing: none of the three reactions is "concealment" — a model honestly told about a failure will not bluff a completed answer; bluffing usually happens when the application layer hid the failure from it. Watch for exactly one pathology: the model resending the same doomed request unchanged — that means the error text lacked clues; go check what content actually said.

## Backoff and caps: the client guardrail

Model intelligence cannot solve two engineering-layer failures: rate limits and timeouts need waiting and retrying, and only the client can do that. The standard practice is exponential backoff: after a failure wait 1 second and retry, then 2 seconds, 4 seconds, doubling each time to give the swamped downstream a breather; when the server's response carries retry-after, honor it first. Backoff must be paired with a retry cap — 5 attempts in this lesson's demo — otherwise one never-recovering fault drags the loop into infinite retries. Retries carry a hidden precondition too: the operation must be re-enterable. Queries retry freely; writes either guarantee idempotency (with an idempotency key) or hand the retry decision to the model to reason about whether the last attempt actually landed. Backoff, caps, plus the round limits and budget ceilings from earlier lessons form the early roster of the guardrail family; what lesson A07, The Runaway Experiment, demonstrates is exactly a loop without these guardrails — failing in far more spectacular ways.

## Treat errors as data

The last layer of failure's value is observability: every failure should leave a structured record — tool name, error type (parameter/timeout/429/permission), retries spent, final outcome. Aggregate and read the distribution: a sudden rise in one tool's parameter errors usually means a prompt or schema change regressed; a downstream 429 spiking on the hour means someone else's cron job is grabbing the quota; permission denials clustering together points at a broken user-role mapping. Failure patterns are direct feedback on tool design — a tool whose parameters the model keeps filling wrong deserves better input_schema and description, not endless retries, and one that times out constantly needs splitting or caching. Treat errors as data and failure turns from incident into roadmap.

## About the demo data

The task, error messages, and data values in the swim lane demo (37 refunds, ¥21,340 total, ledger_id L-2087, backoff 1s→2s→4s, retry cap 5) are illustrative teaching data, not real system output; the is_error / tool_result structure and exponential backoff align with official documentation and common engineering practice, and the demo omits logging and monitoring details.
