---
title: "The RAG Pipeline, End to End"
module: "R"
readingMinutes: 6
level: intermediate
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

The previous lesson watched one request complete its full journey; this lesson opens the door to the RAG module, splitting "an open-book exam for the model" into two stages — offline indexing and online querying. The panorama demo above the prose shows both channels at once, playable beat by beat: watch the six indexing steps first, then follow one question through the eleven beats of the open-book path.

## Why open-book: the two defects of a closed-book model

Think of an LLM as an exam candidate who has read only the books published before its training cutoff: anything after that date, and anything never in the corpus — such as your company's private material — it simply does not know. That is knowledge freezing. Worse is the second defect: a closed-book candidate never hands in a blank sheet. Missing facts get filled in by linguistic momentum — fluent, confident, and unsupported. That is hallucination. Ask "what is our company's Q3 payment-collection policy" and the model, which has never seen that document, will produce something that looks plausible and means nothing. RAG (retrieval-augmented generation) does not try to fix the model; it changes the exam format: first retrieve the relevant passages from a corpus, hand them to the model together with the question, and let it answer open-book. The counter-example is worth drawing too: for casual chat or pure-reasoning tasks that rely on no private or up-to-date material, attaching retrieval only adds noise — the recalled passages have nothing to do with the question, and the model has to work to ignore them. Hallucination and knowledge freezing should also be attributed separately: the former is a tendency to fabricate during generation, the latter is a boundary of the corpus in time and coverage; RAG mainly patches the latter and merely constrains the former.

## The indexing stage: compressing documents into a geometric space

Indexing is the offline preparation — the compile step of the pipeline: run it once, and the artifact (a searchable index) is reused forever; the query stage is the runtime that loads it directly. Four steps. First, clean the documents: strip headers and footers, convert tables to text. Second, chunk: a common setup is about 512 tokens per chunk with a 64-token overlap between neighbors — the overlap guarantees that a sentence straddling a boundary survives intact in both neighboring chunks instead of being cut in half. Third, call the embedding model to encode every chunk into a high-dimensional floating-point vector: the closer the meanings, the smaller the angle between vectors — text becomes coordinates you can compute with. Fourth, write all three pieces — vector, original text, and metadata — into the vector store. One iron rule spans it all: once an embedding model is chosen it is frozen, and indexing and querying must use the same one, because different models' vector spaces are incompatible. Indexing is a one-time cost, rerun only when the knowledge base changes. Chunk size is itself a trade-off: cut too small, a sentence's meaning is scattered and retrieved fragments lack context; cut too large, the relevant passage drowns in unrelated text, diluting retrieval precision while wasting window. The flip side of freezing the embedding model is upgrade cost: switching to a stronger embedding model means rebuilding the entire index — old vectors mean nothing in the new model's space.

## The query stage: four steps of one open-book request

The query stage is the runtime, and every question walks the whole path — four steps. Step one: embed the user's question with the same embedding model (one sentence, done in milliseconds). Step two: use that vector to run cosine-similarity retrieval against the store, taking the top-k most similar passages together with their original text and metadata. Step three: assemble the augmented prompt — the system note says "answer only from the material below; if you cannot cite a source, say so", followed by the retrieved passages and the question. Step four: send it with the old protocol from E01, POST /chat/completions, and collect the streamed result. The key insight about RAG lives here: it invents no new calling protocol — it only rewrites the content of the request body, with a few retrieved passages added to messages and temperature usually lowered (say, 0.2) to curb unsourced improvisation. Each of the four steps has its own failure mode: an overly colloquial question may embed away from the documents' semantic region; retrieval may come back with nothing but a pile of low-scoring chunks; too much material stitched in can overflow the window and get truncated; and the model may ignore the material and improvise anyway. The first three are countered by engineering on the retrieval side; the last can only be contained by prompt constraints and after-the-fact verification. [→ Back to demo step 11](#demo-step-11)

Written out as one copyable sequence (every number comes from the demo above):

```json
{
  "1_retrieve": {
    "embed_query": {
      "model": "<the same embedding model frozen at indexing time>",
      "input": "What is the Q3 payment-collection policy?"
    },
    "vector_dims": 1536,
    "top_k": 5,
    "similarity_scores": [0.91, 0.88, 0.85, 0.71, 0.42]
  },
  "2_rerank_optional": {
    "input": "<the 5 candidate chunks recalled above>",
    "note": "This lesson's demo does not include the step: the order here is pure embedding similarity. A reranker scores query and candidate text together — see R04."
  },
  "3_assemble": {
    "messages": [
      {
        "role": "system",
        "content": "answer only from the material below; if you cannot cite a source, say so\n<docs>…the 5 retrieved passages + metadata (document/section/date)…</docs>"
      },
      { "role": "user", "content": "What is the Q3 payment-collection policy?" }
    ],
    "temperature": 0.2
  }
}
```

## Similarity and top-k: the two dials of retrieval quality

Cosine similarity measures the angle between two vectors: near 1 means nearly the same direction — meanings highly overlapping; near 0 means essentially unrelated. Retrieval just means using the query vector to find the highest-scoring entries in the store. top-k is the first dial: k too small misses key material and the answer comes back incomplete; k too large dilutes the context — in the demo data the fifth hit has already fallen to 0.42, weakly relevant, and folding it into the prompt not only fails to help but crowds the context window and invites strained connections. Real systems set a similarity threshold and would rather drop a low-scoring chunk than keep it as filler. This trade-off is not unique to RAG: context is a scarce resource, and every chunk you put in has to be worth its tokens. A threshold and top-k are usually combined: first filter out the weakly relevant by score, then take the top k among the survivors — one gate sets the quality floor, the other caps the quantity. This is the same ledger as E02's: every passage stitched into the prompt occupies window and costs input fees, so retrieval precision directly decides whether that money is well spent.

## Traceability, and what open-book cannot fix

The biggest dividend of the open-book exam is traceability: the answer can carry a tag like "[Source: Payment Collection Rules §3.2]" that users can open and verify — something a closed-book model can never offer, and the reason policy Q&A, customer support, and compliance teams care about RAG at all. But open-book cannot fix a retrieval miss: if the query is semantically unrelated to everything in the store, retrieval brings back nothing useful, and the model may still cobble together an answer from fragments — hallucination is not eradicated. There is exactly one line of defense: write "if the material is insufficient, say it cannot be found" into the system prompt, and treat a "not found" as a passing answer rather than a failure. In compliance settings the traceability chain has to close the loop to count: the answer carries a source tag, the source opens to the original text, and the document version plus retrieval time are archived, so an audit can recheck item by item. A "not found" thereby earns its legitimacy — better to hand back an answer that openly reports missing material than a fabricated complete one. This lesson is the module R overview; the next two go deeper — R02 into the semantic space and embedding choice, R03 into chunking and retrieval strategy.

> **Three things to take away**
>
> RAG does not modify the model — it changes the exam format: retrieve the relevant passages first, then hand them to the model together with the question.
>
> Indexing is compile time, querying is run time: the index is built once and reused, while the query path is walked in full for every single question.
>
> The dividend of open-book is traceability; its ceiling is retrieval quality: when the search comes up empty the model will still compose an answer, so "if the material is insufficient, say so" has to live in the system prompt, and a "not found" has to count as a passing answer.

## About the demo data

All numbers in the demo — document counts, token counts, chunk counts, vector dimensions, similarity scores, and cost — are illustrative teaching data (not real model output), included to convey the pipeline's shape and orders of magnitude. The structure is real: the stage layout and event order mirror how a production RAG pipeline actually runs. The code block in the prose is teaching data too: it reuses the demo's numbers, and its field structure follows official documentation.
