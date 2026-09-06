---
title: "Few-Shot Examples"
module: "P"
order: 2
description: "Examples are the most direct behavioral spec: example format is the output template, example diversity decides generalization, and example bias writes itself into behavior."
sources:
  - "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/multishot-prompts"
  - "https://help.openai.com/en/articles/6654000-best-practices-for-prompt-engineering-with-the-openai-api"
reviewed_at: 2026-09-06
draft: false
demo: "p02-few-shot"
---

P01 covered saying it clearly with structure; this lesson covers the more direct move: instead of describing the spec, demonstrate it — put a few "input → output" pairs into the prompt and let the model follow the pattern. The technique is few-shot prompting, and on format-sensitive tasks it has the highest value per token; its standing has held from the paper era to today: models change, products rebrand, and "give a couple of examples" remains the first piece of advice that survives verification. The swim lane timeline above walks a ticket-classification task: 0-shot output drifts in format, 2-shot output snaps into line, and then a trap is planted in the examples to watch generalization collapse.

## Examples are the most direct behavioral spec

There are two languages for writing a behavioral spec to a model: adjectives — "be concise, well-formed, professional" — or samples — two clean input-output pairs. The samples almost always win, because "concise" and "well-formed" are stretchy soft constraints to a model, while the literal format inside an example is a hard template it can copy. In the 0-shot call the model outputs Refund Request — semantically right, format drifted; after 2-shot the same semantics come out as refund, aligned verbatim with the examples. Adjectives describe intent; examples define behavior — that is the mechanism behind "show, don't tell". It carries an engineering bonus too: examples are model-version-agnostic — descriptive adjectives can be read differently by a different model, while a strict input-output pair expresses the same thing everywhere, which makes prompt behavior migrate far more smoothly across model upgrades.

## Example format is the output template

The model imitates examples holistically: not just field values but structure, casing, punctuation, length, even tone. Write the example as {"category":"refund"} and the output comes back lowercase without spaces; write it as "Refund Request" and the model feels entitled to capitalize and embellish. Examples are, in effect, the output template — whatever you want the output to look like, the example must look like, and one lazy spot leaks drift. Seen the other way, this is the cheapest format-control mechanism available: instead of a paragraph of format instructions, supply one impeccably formatted sample. Where the examples sit in the context hardly matters; what matters is that they appear as clean pairs with strict formatting — put them near the instructions at the front and leave a clear separator before the real input, so the examples never get mistaken for input to process.

## Diversity decides generalization

Examples teach format, and they also teach classification boundaries — which is where the trap hides. The demo's example set, both entries billing, dragged an obvious refund ticket into billing: all-positive, class-skewed examples quietly tell the model "the answers mostly look like this". Three fixes: at least one example per class, with classes balanced; cover boundary phrasings — abbreviations, typos, colloquial forms, one each; mirror the real distribution — whatever production looks like, pick examples that look like it. Example review should be treated like code review: every example defines behavior, and bias gets written into the model's output verbatim — no errors, no warnings, surfacing only on the evaluation set.

## Quantity and cost trade off

More examples is not better. Every example occupies window budget — the input-side budget re-paid on every request (E04 covered the fixed overhead of history and templates); going from two examples to ten raises cost linearly while returns diminish — usually two to five lock the format, and everything beyond is paying for rare edges. If the example set genuinely needs to be large, the engineering answers are not "add more": use caching to discount a stable prefix (E05 and G02 cover the caching lesson), or split the task into narrower subtasks so each needs fewer examples. Organization matters too: keep same-class examples adjacent, order them by input shape, and separate examples from the real input clearly — none of that costs tokens, yet it lowers the chance the model treats an example as live input. Tie the count to evaluation: when the validation pass rate stops moving after one more example, stop there.

## When to reach for few-shot

Few-shot is not a universal default. Format-sensitive tasks — classification, extraction, structured rewriting — almost always deserve examples, because format drift has the highest downstream cost; natural-language outputs and format-insensitive common-sense tasks are often fine with a clear description, and bolt-on examples just cost money. Two traps deserve vigilance: stale examples — after a product redesign the old field names linger in the examples, and the model faithfully outputs the deprecated format; and domain-mismatched examples — feed Chinese tickets with English-ticket examples and the model imitates a bilingual chimera. Examples need maintenance like code: what sits in a prompt is not "a few samples" but a behavioral spec that goes stale — version it, and when behavior changes, change the examples. One final heuristic: if structure and examples still miss the target, the problem is probably not the prompt — that is the signal you are spinning in prompt space, and it is time to look at task decomposition, model choice, or the evaluation set.

## About the demo data

The ticket texts, classification outputs, and example sets in the swim lane demo are illustrative teaching data, not real system output; the 0-shot drift, 2-shot alignment, and "skewed examples drag the output" phenomena align with behaviors documented in official guidance, and the demo omits sampling-parameter details such as temperature.
