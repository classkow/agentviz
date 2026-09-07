---
title: "Reranking"
module: "R"
readingMinutes: 5
level: intermediate
order: 4
description: "Two-stage retrieval: recall aims to not miss with a wide fast net; reranking aims to not misorder with a slower, sharper model over a small set."
sources:
  - "https://docs.cohere.com/docs/rerank-overview"
  - "https://docs.anthropic.com/en/docs/build-with-claude/retrieval-augmented-generation"
reviewed_at: 2026-09-06
draft: false
demo: "r04-reranking"
---

R02's nearest-neighbor search carries a hidden assumption: similarity ranking equals quality ranking. In real systems that assumption breaks often — the true answer chunk in the demo sits at rank 7 of the vector ordering. Reranking is the technology that repairs this: recall casts a wide net for candidates, and a slower, sharper model refines the order. It sits between retrieval and generation, the only stage of the RAG pipeline that "only sorts and never searches" — which is also why it is so often skipped, and this lesson prices that omission. The swim lane timeline above has six lanes: a complete two-stage retrieval pipeline — top-10 in, top-3 out, one answer delivered.

## The two-stage architecture: not missing, not misordering

Splitting retrieval in two exists because "fast" and "accurate" cannot be had together in engineering. The recall stage uses a bi-encoder: query and document are encoded independently into vectors, vectors compared against vectors, fishing a top-50/top-10 out of a hundred thousand chunks in milliseconds — its mandate is "not missing", casting wide enough that the answer never escapes. The rerank stage uses a cross-encoder: query and each candidate concatenated and passed through one model, all word-level interactions visible — its mandate is "not misordering", turning the wide-net pile into a true ranking. The division of labor shows in the demo: vector recall fishes the answer chunk to rank 7 (not missed), reranking promotes it to rank 1 (not misordered). The working calibrations: recall tens to hundreds, rerank down to a handful, and only top-3/top-5 reach the prompt. The two stages also own distinct failure modes: recall failure (the answer never entered the candidates) sends you back to embeddings and chunking; ranking failure (the answer is in the candidates but ranked too low) is reranking's turf — diagnose which one first.

## cross-encoder versus bi-encoder

The two names correspond to two "reading postures". A bi-encoder is two people writing summaries back to back and comparing fingerprints — the query vector and the document vector are generated without knowledge of each other, compared only after the fact by distance; the speed comes from document vectors being precomputed offline, leaving one query to encode online. A cross-encoder lays the two texts side by side for word-by-word comparison — synonym swaps like "cross-city" for "different-region", coreference, negation, all surface in word-level interaction; the price is that every (query, document) pair needs a fresh model pass, a full-store sweep is impossible, so it only serves small sets. The demo's rank-7-to-the-top upset is the cross-encoder's value in miniature: it matches "cross-city" with "different-region", lexical overlap too thin for the two towers to see, and the cross-encoder catches it at a glance.

## Rescoring and the top-3 effect

The reranking details in the demo repay close reading: the top-10 arrives carrying vector similarities (0.91/0.89/…/0.74/…), the reranker scores each, and the target chunk moves from 0.74 to 0.96 — note that rerank scores and vector similarities are two different rulers and must not be compared across. The post-rerank rank decides the ticket into the prompt: only top-3 gets to meet the LLM. Why does rank matter so much? One, seats — the window budget is finite, and outside the top-3 equals nonexistent; two, position bias — LLMs attend more to, and trust more, context placed earlier, so putting the right chunks first saves the model an attention allocation. "The top 3 decide the answer quality" is not hyperbole; it is the joint conclusion of prompt budget and position bias — the same material, a different rank, and the answer can flip.

## The price of skipping the reranker

A thought experiment (the demo's final event): skip reranking and stuff the vector top-3 straight into the prompt — the answer chunk sits at rank 7, never reaches the context, and the model answers from second-best material, probably wrong or incomplete. That is how to quantify reranking's value: it does not improve "is the answer in the store", it improves "did the answer reach the model". Within R05's evaluation framework this shows up as the gap between hit rate and MRR — hit rate says "in the recall at all", MRR says "at what rank", and reranking pulls the latter directly. There are legitimate skip scenarios: a tiny store (a few dozen chunks), a single query pattern, a latency budget too tight for a second-stage model — always let evaluation decide. Reranking also yields a neglected by-product: the rerank score itself is a signal — a maximum score below the historical normal range usually means the store holds nothing relevant, and the right move is to answer "insufficient material" rather than forcing the model to improvise from weak candidates.

## Reranking's place in engineering

A reranker is a separate cost line from the generator: every query passes dozens of candidates through a model, with latency and expense growing linearly in candidate count — capping the candidate count (recall 50, not 500) caps the rerank bill. For selection, dedicated reranking models (Cohere's Rerank line, for example) and a general LLM acting as judge are both viable routes — the former fast and steady, the latter flexible and dear. Reranking also explains an architectural phenomenon of RAG systems: the troubleshooting path for retrieval quality is always "recall rate first, then ranking" — if the answer is absent from recall, that belongs to chunking and embedding (R02/R03); if it is in the recall but cannot reach the top-3, that belongs to reranking. The two stages each mind their own segment; never make the reranker pay for the chunker's mistakes. After this lesson, one question remains for the R module: is the whole two-stage pipeline actually good? R05's evaluation framework answers.

## About the demo data

The similarity series (0.91/0.89/0.86/0.84/0.82/0.78/0.74/0.72/0.70/0.68), the rerank score movement (0.74→0.96), and the answer text in the swim lane demo are illustrative teaching data, not real model output; the bi-encoder/cross-encoder behaviors align with the public retrieval literature and the official documentation of Cohere and Anthropic.
