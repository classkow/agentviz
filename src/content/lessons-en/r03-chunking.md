---
title: "Chunking Strategies"
module: "R"
readingMinutes: 4
level: intermediate
order: 3
description: "Too-large chunks drown retrieval in noise, too-small ones fragment context; chunk boundaries directly decide whether the answer is inside the recalled chunk."
sources:
  - "https://www.anthropic.com/news/contextual-retrieval"
  - "https://python.langchain.com/docs/concepts/text_splitters/"
reviewed_at: 2026-09-06
draft: false
demo: "r03-chunking"
---

R02 covered how vectors compare similarity; this lesson covers the step before similarity: how documents get cut. Chunking is the least glamorous yet most fate-deciding step of RAG — the unit of retrieval is the "chunk", not the document: the finest granularity of recall, the object of embedding, and the material placed into the prompt are all chunks. When chunking goes wrong, neither retrieval nor generation knows the cause; they simply absorb the consequences, which is why it earns its own lesson. The swim lane timeline above cuts one product manual twice — fixed windows once, structure once — then searches both with the same question, and the contest decides itself.

## The dilemma of too big and too small

The first tension of chunking is granularity. Chunks too large: a whole chapter crammed into one chunk, the sentences relevant to the query diluted by surrounding irrelevance — the embedding vector gets "averaged out" and similarity scores refuse to separate; recalled chunks also burn prompt tokens (E04's budget table tightens immediately). Chunks too small: semantics get shredded, a chunk holds half a sentence, no chunk alone says one complete thing; recalled fragments cannot assemble into evidence, and the model receives broken excerpts. Both directions hurt recall, differently: oversized chunks hurt "does it rank high", undersized chunks hurt "is it usable once recalled". The fixed strategy in the demo produces 1070 chunks — "fine-grained" on the surface, in truth full of semantic scraps; the structural strategy produces 320, each one whole. There is no universal optimal chunk length — it is a function of query type, document structure, and model window — but there is a universal test: every chunk should be independently readable.

## Fixed windows and structural splitting

Fixed-window chunking (512 tokens, 64 overlap) is the simplest to build: slide by token count, index when done. Its costs are visible in the demo — tables sliced in half, a section's opening squeezed into the previous section's tail. Overlap softens the boundary problem: adjacent chunks share a stretch of text, so an answer straddling a boundary still finds one chunk holding complete context — but overlap is a stopgap, boundaries stay messy, and it inflates storage: a 512 window with 64 overlap has its effective content density discounted. Structural chunking follows the document's native structure: heading levels and section boundaries, tables and code blocks kept whole, only overlong blocks subdivided. Its chunks align with the units humans read — the "Return Policy" section lives under one heading, complete from title to last sentence. Beyond the two strategies lie advanced plays like semantic chunking (finding break points by between-sentence similarity), but the engineering order is: get structural chunking right first, then reach for the advanced tier. The demo's controlled experiment delivers the verdict: the same question misses half its answer under fixed chunking (the sentence straddles chunks 441/442) and hits whole under structural chunking.

## Tables and code are special chunks

Two content types must stay whole: tables and code. A table cut in half loses its row-column correspondence — the top of the "shipping rates" table has no amount column, the bottom has no row labels, and each half is waste; cut code loses syntactic and logical integrity — a retrieved snippet will not even compile. The chunker must recognize both structures and route around them. Chunkers also differ wildly by format: Markdown, PDF, and web pages pose different difficulties, and PDF layout reconstruction (columns, headers, table lines) is the most common chunking accident in practice — parse structure first, chunk second; the order cannot be swapped. Post-chunk inspection is equally often skipped: randomly sample a few dozen chunks and read them — "can this be understood alone, and does it say one thing" — ten minutes of human sampling beats rounds of blind parameter tuning.

## Metadata travels with the chunk

Every chunk should carry metadata: source document, section path, page number, update date. Metadata does not alter the similarity computation, yet it earns its keep in three places: provenance after recall — answer citations and audits depend on it; filtered search — "only policies updated in 2026" is a metadata filter; and disambiguation — when "breach" in chapter one differs from "breach" in chapter seven, section context helps the model place it. Anthropic's contextual retrieval goes one step further: before indexing, a model generates for each chunk a short description of "where this chunk sits in the document and what it does", prepended to the chunk before embedding — a little indexing cost for a marked lift in recall quality. Metadata is the chunk's identity card; without one, a chunk in the store is untraceable.

## Boundaries are destiny

Compress this lesson into one sentence: chunk boundaries directly decide whether "the answer is inside the recalled chunk". R05's evaluation turns that sentence into numbers — the fixed strategy's missed recall in the demo is exactly what the evaluator's hit-rate metric catches. The practical order of chunking optimization: cut by structure first (use headings when present, semantic segmentation when not); test recall with a real query set; only then consider length tweaks, more overlap, or fancier strategies. Chunking is the highest-leverage optimization in RAG: it costs no model money, only engineering time — and when it fails, every downstream stage pays the bill.

## About the demo data

The manual's structure (62 pages / 12 chapters / 86 sections / 11 tables), chunk counts (1070 vs 320), chunk numbers (441/442), and similarity rankings in the swim lane demo are illustrative teaching data, not real system output; the behaviors of fixed-window and structural chunking align with mainstream framework documentation and public engineering practice.
