---
title: "Evaluating RAG"
module: "R"
order: 5
description: "Two-level evaluation: retrieval-level (hit rate / MRR) asks whether the answer's chunk was recalled; generation-level (faithfulness / relevance) asks whether the answer says only what the sources support."
sources:
  - "https://docs.ragas.io/en/stable/"
  - "https://docs.anthropic.com/en/docs/test-and-evaluate/develop-tests"
reviewed_at: 2026-09-06
draft: false
demo: "r05-rag-eval"
---

R02 through R04 assembled the retrieval chain; this lesson answers the acceptance question: how do you know the system actually got better? "Clicking through a few examples by hand" is not evaluation — it is blind to regressions, silent when one change breaks three things, and the examples clicked by hand tend to be the system's happiest paths, precisely the ones that least need testing. Evaluating RAG is the science of grading an open-book exam: two levels of metrics, a golden dataset, and controlled iteration. The swim lane timeline above runs 10 constructed evaluation questions through two rounds, walking the climb from 0.7 to 0.9 end to end.

## Two levels, two ledgers

RAG is a two-stage pipeline; its evaluation must also be two-level. The retrieval level asks one thing: did the chunk holding the standard provenance appear in the recall results? The metric is hit rate — if 7 of 10 provenance chunks are recalled, the hit rate is 0.7; one step up sits MRR (mean reciprocal rank), which also asks "at what rank" — rank 1 and rank 10 in the recall both score a 1, yet their usability differs by miles. The generation level asks two things: faithfulness — does the answer say only what the retrieved content supports; and relevance — is the answer on-topic. Keeping two ledgers is what makes attribution possible: the demo's first round shows retrieval 0.7 against generation 0.8, and the weak leg immediately shows as retrieval — looking only at end-to-end "was the answer right", you could never tell which stage to fix. Misattributing means misinvesting: swapping in a stronger generator for a system whose retrieval is the weak leg is the classic way money evaporates.

## The golden dataset: QA pairs with provenance

The foundation of evaluation is the evaluation set: a batch of questions, each carrying a golden answer and its standard provenance — which section, which paragraph. Provenance is what separates RAG evaluation from ordinary QA evaluation — without it, retrieval-level metrics cannot even be computed. The set should cover three sources of questions: real user queries (the high-traffic paths), edge cases (long questions, multi-condition, colloquial), and adversarial cases (questions the store cannot answer — to test whether the system admits it does not know). Golden datasets also need preservation against rot: when documents update, provenances drift and answers age, so the evaluation set must be reviewed in step with the knowledge store, or the grading standard itself rots first. Scale need not be grand: a few dozen high-quality questions with provenance and periodic human review beat thousands of questions of murky origin. The demo uses 10 questions to show the flow; in a real project, conclusions at that scale carry no decisions.

## Faithfulness: hallucination defined for RAG

In the demo, question 6's answer produces "shipping is free", and no recalled chunk contains that sentence — this is hallucination's precise definition in the RAG context: saying more than the sources say. Distinguish it from "the answer is wrong": contradiction with the source is a different error class; hallucination is a new assertion the sources never supported, the model treating retrieved material as creative material. Faithfulness evaluation can proceed sentence by sentence against the recalled chunks (a rule or a small model judging "does this sentence have source support"), and frameworks like RAGAS productize the flow. The cure lives in the system, not the evaluator: prompt instructions like "answer only from the given material; if it is insufficient, say so", lower generation temperature, plus P04's positive phrasing — but the grading standard comes first; treatment follows. Faithfulness should also be read grouped by question type: certain kinds (amounts, dates, policy clauses) hallucinate at naturally higher rates, and grouped statistics localize "where it invents most" down to question features.

## Iteration with control: the 0.7 to 0.9 chain of attribution

The demo's two batch runs are a standard controlled experiment: the first round measures retrieval at 0.7; root-causing finds 2 of the 3 missed questions had answer sentences cut by chunk boundaries (R03's old problem); the second round changes only the chunking strategy and nothing else — 0.7 climbs to 0.9, and the gain can be confidently attributed to chunking. Single-variable changes, full re-runs, two-round comparisons — all three steps are mandatory; a report of "changed three things, gained five points" is worthless because it cannot tell you where to invest next. The remaining question 10 is also worth reading: the store simply has no "warranty" document — a knowledge gap, not a retrieval fault — and the fix is adding documents, which enters the knowledge store's change process. The endpoint of evaluation is not a pretty score but a state where every gap has an attribution and every attribution has an action.

## When metrics rise but the end-to-end does not

The troubleshooting scenario most worth rehearsing: retrieval metrics improve and the user experience does not. Walk the mantra in order: first audit the retrieval evaluation itself — is the evaluation set stale, are the provenance labels accurate; then faithfulness — better retrieval feeds more material in, and the model may grow confused (contradictory chunks in one context); suspect the generation model last. A second common illusion is treating an LLM's subjective scoring as the only judge — LLM-as-judge is a useful tool, but the judge is itself a model with its own biases (preferring longer answers, preferring its own style), and it belongs in combination with rule checks and human sampling, a combination covered in G01. Once built, the evaluation system becomes the RAG system's health center: every embedding swap (R02's re-embedding), chunking tweak (R03), or reranker adoption (R04) lets the data speak first.

## About the demo data

The question count (10), metrics (hit 0.7→0.9, faithfulness 0.8→0.9, relevance 0.8), question numbers, and the "shipping is free" hallucination sample in the swim lane demo are illustrative teaching data, not real evaluation output; the two-level metrics and the faithfulness definition align with public evaluation frameworks such as RAGAS.
