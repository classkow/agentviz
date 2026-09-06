---
title: "The RAG Pipeline, End to End"
module: "R"
order: 1
description: "A two-stage overview: offline indexing compresses documents into a searchable vector index, and online open-book retrieval stitches the retrieved material into the prompt before answering."
sources:
  - "https://docs.anthropic.com/en/docs/build-with-claude/retrieval-augmented-generation"
  - "https://python.langchain.com/docs/tutorials/rag/"
  - "https://docs.anthropic.com/en/docs/build-with-claude/embeddings"
reviewed_at: 2026-09-06
draft: false
demo: "r01-rag-pipeline"
---

The previous lesson watched one request complete its full journey; this lesson opens the door to the RAG module, splitting 「an open-book exam for the model」 into two stages — offline indexing and online querying. The panorama demo above the prose shows both channels at once, playable beat by beat: watch the six indexing steps first, then follow one question through the eleven beats of the open-book path.

## Why open-book: the two defects of a closed-book model

Think of an LLM as an exam candidate who has read only the books published before its training cutoff: anything after that date, and anything never in the corpus — such as your company's private material — it simply does not know. That is knowledge freezing. Worse is the second defect: a closed-book candidate never hands in a blank sheet. Missing facts get filled in by linguistic momentum — fluent, confident, and unsupported. That is hallucination. Ask 「what is our company's Q3 payment-collection policy」 and the model, which has never seen that document, will produce something that looks plausible and means nothing. RAG (retrieval-augmented generation) does not try to fix the model; it changes the exam format: first retrieve the relevant passages from a corpus, hand them to the model together with the question, and let it answer open-book.

## The indexing stage: compressing documents into a geometric space

Indexing is the offline preparation — the compile step of the pipeline: run it once, and the artifact (a searchable index) is reused forever; the query stage is the runtime that loads it directly. Four steps. First, clean the documents: strip headers and footers, convert tables to text. Second, chunk: a common setup is about 512 tokens per chunk with a 64-token overlap between neighbors — the overlap guarantees that a sentence straddling a boundary survives intact in both neighboring chunks instead of being cut in half. Third, call the embedding model to encode every chunk into a high-dimensional floating-point vector: the closer the meanings, the smaller the angle between vectors — text becomes coordinates you can compute with. Fourth, write all three pieces — vector, original text, and metadata — into the vector store. One iron rule spans it all: once an embedding model is chosen it is frozen, and indexing and querying must use the same one, because different models' vector spaces are incompatible. Indexing is a one-time cost, rerun only when the knowledge base changes.

## The query stage: four steps of one open-book request

The query stage is the runtime, and every question walks the whole path — four steps. Step one: embed the user's question with the same embedding model (one sentence, done in milliseconds). Step two: use that vector to run cosine-similarity retrieval against the store, taking the top-k most similar passages together with their original text and metadata. Step three: assemble the augmented prompt — the system note says 「answer only from the material below; if you cannot cite a source, say so」, followed by the retrieved passages and the question. Step four: send it with the old protocol from E01, POST /chat/completions, and collect the streamed result. The key insight about RAG lives here: it invents no new calling protocol — it only rewrites the content of the request body, with a few retrieved passages added to messages and temperature usually lowered (say, 0.2) to curb unsourced improvisation.

## Similarity and top-k: the two dials of retrieval quality

Cosine similarity measures the angle between two vectors: near 1 means nearly the same direction — meanings highly overlapping; near 0 means essentially unrelated. Retrieval just means using the query vector to find the highest-scoring entries in the store. top-k is the first dial: k too small misses key material and the answer comes back incomplete; k too large dilutes the context — in the demo data the fifth hit has already fallen to 0.42, weakly relevant, and folding it into the prompt not only fails to help but crowds the context window and invites strained connections. Real systems set a similarity threshold and would rather drop a low-scoring chunk than keep it as filler. This trade-off is not unique to RAG: context is a scarce resource, and every chunk you put in has to be worth its tokens.

## Traceability, and what open-book cannot fix

The biggest dividend of the open-book exam is traceability: the answer can carry a tag like 「[Source: Payment Collection Rules §3.2]」 that users can open and verify — something a closed-book model can never offer, and the reason policy Q&A, customer support, and compliance teams care about RAG at all. But open-book cannot fix a retrieval miss: if the query is semantically unrelated to everything in the store, retrieval brings back nothing useful, and the model may still cobble together an answer from fragments — hallucination is not eradicated. There is exactly one line of defense: write 「if the material is insufficient, say it cannot be found」 into the system prompt, and treat a 「not found」 as a passing answer rather than a failure. This lesson is the module R overview; the next two go deeper — R02 into the semantic space and embedding choice, R03 into chunking and retrieval strategy.

## About the demo data

All numbers in the demo — document counts, token counts, chunk counts, vector dimensions, similarity scores, and cost — are illustrative teaching data (not real model output), included to convey the pipeline's shape and orders of magnitude. The structure is real: the stage layout and event order mirror how a production RAG pipeline actually runs.
