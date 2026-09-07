---
title: "Function Calling: the Model Asks, the Client Acts"
module: "T"
readingMinutes: 5
level: intro
order: 1
description: "Tools are a list of function declarations sent with the request; the model emits structured requests, not results — execution authority always stays on the client."
sources:
  - "https://docs.anthropic.com/en/docs/build-with-claude/tool-use"
  - "https://help.openai.com/en/articles/8555517-function-calling-in-the-openai-api"
reviewed_at: 2026-09-06
draft: false
demo: "t01-function-call"
---

A01 reduced an Agent to "LLM + loop + tools", and A02 replayed a full episode; this lesson takes apart the smallest component of them all: one complete round trip of a tool call. It is small enough to be a single exchange, yet it carries all the information flowing between an agent and the real world — every model "action" leaves through here and every "observation" enters through here. The swim lane timeline above spreads the round trip across five lanes — user, application, LLM, tool set, and database — from declaring the tool list to replying with the result, eleven steps in total, and every step's ownership is worth reading closely.

## Tools are a list of function declarations shipped with the request

A tool is not a plugin installed into the model; it is a declaration sent with each request: a tools array where every item carries three things — name (the function name), description (an explanation written for the model), and input_schema (parameter constraints in JSON Schema). All three are "documentation": the description decides when the model reaches for the tool, the input_schema decides how it fills the parameters, and vague writing means misuse. For example, "query orders" is a poor description — the model cannot tell whether refunds are covered or cross-quarter queries are allowed; "aggregate paid-order totals by region and quarter; excludes refunds and line items" is a good one — with the boundary spelled out, the model naturally looks elsewhere when the ask falls outside it. input_schema works the same way: list the enum values and annotate the fields, and the parameter error rate drops a notch immediately. Declaration and request travel together, which means the model never touches real code — all it sees is the list and the prose; the function bodies stay in your application forever.

Step 2 of the demo sends exactly this (field names follow Anthropic's tool declaration format):

```json
{
  "tools": [
    {
      "name": "get_order_total",
      "description": "Aggregate paid-order totals by region and quarter; excludes refunds and line items",
      "input_schema": {
        "type": "object",
        "properties": {
          "region": { "type": "string", "description": "Sales region, e.g. \"East China\"" },
          "quarter": {
            "type": "string",
            "enum": ["Q1", "Q2", "Q3", "Q4"],
            "description": "Fiscal quarter"
          }
        },
        "required": ["region", "quarter"]
      }
    }
  ]
}
```

## The model emits a request, not an execution

Saying the model "calls a tool" misleads: what it outputs is not an execution result but a structured `tool_use` request — type marks the block kind, id is the unique handle of this request, name points to a declared function, input holds the parameters it generated from the schema, and stop_reason flips to `tool_use`, meaning "I am waiting for the result". After the request arrives, your code does the actual work: validate, execute, collect. Execution authority always stays on the client — that is design, not limitation. Permissions, billing, auditing, and rate limiting all happen on your turf, and the model never touches the network by itself; all it can do is ask. Seen from another angle, this is the only viable architecture for letting a model touch the real world safely: database credentials, internal addresses, and delete permissions never need to appear in any prompt — the model cannot reach them even if it tries. All it can do is file a request slip; whether to approve and how to approve lives entirely in your code. [→ Back to demo step 4](#demo-step-4)

```json
{
  "role": "assistant",
  "stop_reason": "tool_use",
  "content": [
    {
      "type": "tool_use",
      "id": "toolu_01A",
      "name": "get_order_total",
      "input": { "region": "East China", "quarter": "Q2" }
    }
  ]
}
```

## The reply: tool_result paired by id

With the result in hand, append a `tool_result` block to messages and send it back: `tool_use_id` must pair with the request's id, and content carries the payload — plain text or structured content. This step is where the model's "observation" comes from — without the reply it stays stuck at "waiting for the result"; after the reply it has the context to keep reasoning or produce the final answer, at which point stop_reason becomes end_turn and the round closes. One easily missed rule: results must be replied in correspondence with their requests, and no other role's message may be inserted between a request and its reply, or some client runtimes reject the message list outright. Building the reply into a fixed helper rather than hand-assembling messages everywhere makes that class of pit disappear. The id pairing looks trivial but is the lifeblood of the next lesson: when several requests are in flight, the id is the only way to know which result answers which request. [→ Back to demo step 8](#demo-step-8)

```json
{
  "role": "user",
  "content": [
    { "type": "tool_result", "tool_use_id": "toolu_01A", "content": "¥4,182,000" }
  ]
}
```

## Validation and timeouts: the client's execution discipline

Never take model-generated parameters at face value: input_schema validation runs before execution — wrong types, missing enum values, absent fields, all rejected locally. Execution has its own discipline: timeouts are mandatory (no "let the slow service take its time" option for external queries), retry policy is client-side engineering, and overlong results must be truncated before the reply (stuffing a hundred-thousand-character web page back into context is a classic rookie accident). Write operations deserve one more thought: idempotency — the same transfer request executed twice because a timeout triggered a retry is an incident, so give writes a client-generated idempotency key and retries become safe. None of this discipline needs the model's cooperation — it is ordinary application code, yet it decides whether the tool-call chain holds up.

## The smallest component, the biggest leverage

Zoom back out: this round trip is the smallest component of one turn of the A01 loop — the model requests, the client executes, the result is replied, the model continues. The field semantics align with Anthropic's `tool_use` / `tool_result` and OpenAI's function calling: the two vendors differ little in naming, and structurally both are "declare a list → structured request → client executes → reply paired by id". Once you own this smallest component, T02's parallel calls are just "emit several requests at once, execute concurrently", and T03's failures and retries are just "reply with an error instead of a result" — both are one more layer of scheduling on the same round trip. Looking further out: the R module's retrieval, the A module's loops, and MCP are all different assemblies of this one component — the tool list can become retrieval endpoints, and a loop is simply this round trip run several times over. So this lesson is worth a slow read: the foundation of every module that follows sits in these five lanes.

## About the demo data

The JSON examples, data values (East China's Q2 order total of ¥4,182,000), and query details in the swim lane demo are illustrative teaching data, not real system output; the `tool_use` / `tool_result` field structure aligns with official documentation semantics, and the demo omits engineering details such as request headers and authentication. The code blocks in the prose are teaching data as well — they reuse the demo's numbers, and their field structure follows official documentation.
