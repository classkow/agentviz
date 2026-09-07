---
title: "Structured Prompts"
module: "P"
order: 1
description: "Role, task, constraints, and output format — a format declaration pins the model's prose instinct so output goes from luck to verifiable."
sources:
  - "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/be-clear-and-direct"
  - "https://help.openai.com/en/articles/6654000-best-practices-for-prompt-engineering-with-the-openai-api"
reviewed_at: 2026-09-06
draft: false
demo: "p01-structured-prompt"
---

The E module squared away tokens and cost, the T module put the model's hands to work; the P module steps further upstream to the root question: how do you state the requirement so the model doesn't drift? With the same model, a different prompt structure can produce output a generation apart in quality — not mysticism, but the engineering of requirement expression. The swim lane timeline above runs the same task twice: a loose-paragraph prompt against a structured one, everything else identical.

## The quartet: role, task, constraints, format

The skeleton of a structured prompt has four parts. Role tells the model "who you are, what voice you speak in" — it narrows the output space; a support agent and a legal advisor have entirely different boundaries of phrasing. Task states "what to do", with concrete verbs: "extract", "rewrite", "classify" are all more reliable than "handle this", which hands the definition back to the model. Constraints state "where the boundaries are": what to fill for missing fields, which date format to use, which content is off-limits — constraints front-load business rules before generation so the model doesn't have to guess policy. Output format states "what it looks like": a field list or a JSON Schema — the highest-leverage member of the quartet, expanded next. You don't need all four every time, but every debugging pass should first check which one is missing — the missing piece is very often the disease.

## The format declaration pins the prose instinct

The model's default inertia is conversation: prose in, prose out. To pull structured, database-ready data out of that inertia you must declare the format explicitly. Demo v1 pays exactly this price — "extract all the information" yields a fluent paragraph from which only 2 of 4 fields can be reliably parsed. v2 adds "output JSON only, fields: sender, deadline, priority, reply_by", and the same model instantly produces a four-field JSON. There are two ways to write the declaration: a field list suits simple cases — names and meanings; a JSON Schema suits complex ones — types, requiredness, enums, and nesting all expressible, and reusable as the same contract your downstream validator checks — prompt and validator share one definition, and format disputes vanish. The essence of a format declaration is collapsing the output space from unbounded to bounded: the model no longer improvises style but fills the frame you drew. One more easily missed detail: say what to do about missing values — the single line "fill unavailable fields with null" saves half the downstream parsing incidents.

## Delimiters and structure lower the misreading rate

Long prompts invite misreading: background mistaken for task, examples mistaken for instructions, constraints from the second half grafted onto the first. The countermeasure is delimiters — section headings, triple quotes, XML-style tags, or Markdown blocks that cut "background", "task", "material", and "format requirements" into clean sections, one concern each. For example, wrap the document to process in a `<document>` tag with the instructions outside it — when processing a long document, the model locates the boundary first and reads inside it second, and the misreading rate drops markedly. Misreading probability falls monotonically with structure: the model's judgment of "which part is material and which is instruction" relies mainly on structural markers, not semantic guessing. In long prompts, keep material and instructions strictly separated — material is the input being processed, instructions are how to process it; blending them makes the model guess rules while it works.

## Where the difference actually lies

Read the demo contrast closely: the difference is not politeness or length but "who defines the output". The loose prompt leaves definition to the model — conversational inertia writes prose; the structured prompt takes definition back for the requirement side — fields, format, boundaries all explicit. Quality therefore shifts systematically, not just "a little better this time" but "stable every time". For pipelines whose downstream consumes structured data — validation, storage, statistics — this is the difference between usable and unusable. The same structured prompt also migrates across models far more cheaply: a field list is a field list on any model, while prose style drifts with each. Conversely, chat, brainstorming, and open-ended writing don't need the quartet — conversational inertia is already the right output shape, and forcing structure there is just awkward.

## The price of over-constraining

Structure has a dark twin: over-constraint. Pin the output too hard — field types down to the character, length down to the paragraph, wording rules stacked on rules — and the model starts squeezing to fit: inventing content to fill fields, cutting key facts to hit a word cap, sacrificing accuracy to obey the template. When accuracy and format compliance conflict, the loss usually lands on the side you can't see: the fields are filled, but the values are invented. So constrain to "enough": ask of every field "does downstream really need this", leave every limit an exit of "fill null if unavailable" — better the model admits a gap than fabricates completeness. The full repair methodology — change one thing, keep comparisons — is covered in P04; for now remember one line: structure is a tool, not a faith, and the test is always the pass rate of downstream validation and evaluation.

## About the demo data

The email content, extracted fields, and JSON output in the swim lane demo are illustrative teaching data, not real system output; the v1/v2 contrast and the quartet breakdown align with both vendors' official prompt guidance, and the demo omits engineering details such as retries and fallbacks.
