---
title: "Semantic Space: Embeddings and Nearest Neighbors"
module: "R"
readingMinutes: 4
level: intermediate
order: 2
description: "Embeddings map text into high-dimensional vectors where close semantics means small angles; cosine similarity and nearest-neighbor search are the bedrock of RAG, frozen at selection time."
sources:
  - "https://docs.anthropic.com/en/docs/build-with-claude/embeddings"
  - "https://docs.cohere.com/docs/embeddings"
reviewed_at: 2026-09-06
draft: false
demo: "r02-embeddings"
---

R01 walked the full RAG pipeline; this lesson dives to the physical layer of retrieval: semantic space. In the world of keyword search, "I bought the wrong thing — can I return it?" never matches "return policy" — different characters, different words. Embeddings change the rules: text is mapped into high-dimensional vectors, meaning encoded as geometry, and semantically close texts end up at small angles. The swim lane timeline above places three documents in the store and then runs two retrievals — one with the original wording, one paraphrased — to show what semantic search actually "understands".

## Embeddings: meaning as coordinates

An embedding model is a "text → vector" function: a passage in, a vector of several hundred to a few thousand dimensions out. The training objective gives it its geometric properties — semantically related texts end up near each other in vector space. Retrieval thus becomes geometry: encode the query the same way and find the nearest neighbors in the store. In the demo, the three documents each take a coordinate after indexing, and "return policy" with "refund process" naturally land in one semantic cluster — the root of every recall behavior that follows. The best way to understand embeddings is to remember their boundary: they encode an approximation of "meaning", not factual correctness — close vectors mean "similar", not "true". Input quality is also easy to neglect: the text sent to the model should be a complete semantic unit (title plus body, not an orphaned half-sentence), and inputs beyond the model's maximum length get truncated — whatever was cut away has no vote in that vector's "opinion".

## Cosine similarity and nearest neighbors

How do you compare two vectors' distance? Text retrieval's convention is cosine similarity: the cosine of the angle between vectors — direction only, not length. Euclidean distance loses to it for engineering reasons: vector magnitude is contaminated by non-semantic factors like word count and phrasing, while direction carries the semantics. Scores fall between -1 and 1 — the demo's 0.91, 0.87, 0.42 are on this scale; scores only support relative ranking within one model, and are not comparable across models. Nearest-neighbor search is "compute similarity across the store, take the highest few". With three documents, exact computation is fine; real stores hold millions — exact search cannot scale, so approximate nearest neighbor (ANN) indexes trade a sliver of recall for millisecond latency. How much recall is lost is measured by evaluation — that is exactly what R05 is for.

## Close in meaning, apart in characters

The demo's core contrast is the second query: "I bought the wrong thing — can I send it back?" shares almost zero lexical overlap with "return policy", yet the two are semantically adjacent — similarity 0.88, still a hit. That is the generational advantage of embeddings over keyword search: resilience to paraphrase, typos, and colloquial phrasing. The soft spot deserves equal attention: query "warranty terms" and, with no such document in the store, the top-1 similarity is only 0.31 — below the threshold, the system should return "not found". Forcing the least related result onto the model is more dangerous than admitting the store lacks it: the model will treat noise as evidence, and hallucination begins with weak evidence presented as solid. Thresholds should not be guesses: examine the evaluation set for the gap between "the lowest similarity among relevant queries" and "the highest among irrelevant ones", and cut the threshold inside that gap — which is why the threshold is chosen and frozen together with the model.

## Dimensions and the discipline of selection

How many dimensions should embeddings have? It is a selection parameter: higher dimensions mean more expressiveness and higher storage and search costs; mainstream models range from a few hundred to a few thousand. More important than dimension count is the discipline of "freezing": once an embedding model is chosen, every vector in the store is bound to it — switching models means re-embedding all documents, along with rebuilding metadata pipelines and re-calibrating thresholds, effectively demolishing and rebuilding the retrieval layer. So selection deserves a pilot evaluation: test recall quality on a real domain query set before rolling out store-wide. The demo's indexing event deliberately notes "the model used at indexing time is frozen from that moment" — that is what it means.

## Reefs of language and domain

Embedding models are best inside their training distribution and stumble outside: models trained mainly on one language may misplace specialized terminology or regional phrasing; multilingual scenarios should confirm cross-language alignment — in a mixed Chinese-English store, whether the Chinese term for returns and the English "return" land in the same cluster is a one-shot test. These reefs never raise errors; they show up as the quiet decay of recall quality, and only evaluation reveals them. One more under-appreciated practical detail: queries and documents should be encoded with the same model and the same prefix convention — some embedding models require distinct prefixes for queries versus passages (like "query:" and "passage:"), and swapping them systematically lowers similarity in ways a single test rarely catches. The foundation is now laid: how vectors come to be (this lesson), how chunks are cut (R03), how ranking gets refined (R04), how quality is measured (R05) — the skeleton of the R module is complete.

## About the demo data

The documents, queries, and similarity values in the swim lane demo (0.91/0.87/0.42/0.88/0.83/0.40/0.31) are illustrative teaching data, not real embedding-model output; the 1024-dimension figure is a constructed example. Real similarity distributions vary by model and text; consult the official documentation of the chosen model.
