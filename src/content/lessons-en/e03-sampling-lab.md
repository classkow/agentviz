---
title: "The Sampling Lab: temperature, top-p, and top-k"
module: "E"
readingMinutes: 6
level: intro
order: 3
description: "Drag temperature, top-k, and top-p yourself and watch the next-token probability distribution reshape and resample in real time."
sources:
  - "https://huggingface.co/docs/transformers/main/generation_strategies"
  - "https://platform.openai.com/docs/api-reference/chat/create"
reviewed_at: 2026-09-06
draft: false
demo: "e03-sampling"
component: "sampling"
---

The previous lesson followed one request through its complete journey; this lesson drills into the most critical step on the server side: when generating token by token, how does the model "pick" the next token from tens of thousands of candidates. The sampling lab above hands you the logits of a set of candidate tokens — drag the temperature, top-k, and top-p sliders to reshape the probability distribution in real time, hit "Sample once" to draw from it yourself, or hit "Draw 200 times" to run two hundred draws at once and set each candidate's measured frequency beside its theoretical probability.

## Where the probabilities come from

Inside the model there is no ready-made "next word" answer — only a pile of scores: every token in the vocabulary gets a logit, an unnormalized real-valued score that can be positive or negative. softmax turns these logits into a legal probability distribution: exponentiate each value (guaranteeing non-negativity), then divide by the sum (guaranteeing the total is 1) — exactly the "sum the weights, then place the point by share" move you would write for weighted random sampling by hand. softmax is an exponential amplifier: for every 1 point a logit sits above another, the probability ratio between the two grows by a factor of e (about 2.7), so a tiny gap in scores becomes a lopsided gap in selection rates. Up to this point everything is a deterministic computation; the "randomness" happens in the next step — drawing lots according to this distribution. Two boundaries are worth remembering: a logit is not a probability — only differences carry meaning, and adding the same constant to every logit leaves softmax's output unchanged; when two scores tie, both get exactly equal probability, and which one gets drawn is pure luck. In other words, the same logits at the same temperature always yield the same distribution — all the uncertainty concentrates in that final draw.

## Temperature: the sharpness of the distribution

Temperature acts before softmax: divide each logit by T, then exponentiate. With T below 1, score gaps widen, probability concentrates toward the head, and the distribution becomes "sharp" — output is more stable and reproducible. With T above 1, gaps compress, long-tail tokens get a chance, and the distribution becomes "flat" — output is more diverse and drifts more easily. Think of T as the gain knob on a signal chain: the input signal is unchanged, but higher gain means wilder swings. As T approaches 0 you get argmax every time (greedy decoding); at large T the draw approaches uniform. Drag the temperature slider in the demo — or hit the 0.2 / 1.0 / 2.0 preset buttons — and watch the same set of logits switch between three shapes. T exactly equal to 0 is a mathematical nuisance — division by zero — so implementations special-case it as argmax, taking the top score with no draw at all. The other extreme is T approaching infinity: every logit divided by a huge number crowds together, the distribution approaches uniform, and the model all but picks blindfolded from the vocabulary. The usable working range always sits between the two extremes.

## top-k: the hard cutoff

top-k is a hard gate: sort the candidates from most to least probable, keep the first k, zero out the rest, then renormalize the survivors (divide by their probability sum) so the distribution stays legal. It is like a hardcoded `resize(k)` in C++: the number of surviving candidates is fixed regardless of content — k=5 always keeps exactly 5, even if the 5th and 6th differ by one ten-thousandth of a probability. The upside is predictable behavior and a cheap implementation; the downside is the indiscriminate cut: with a vocabulary in the hundreds of thousands, a small k may clip valuable candidates while a large k lets in plenty of long-tail noise. In the demo, drag the top-k slider from 12 down to 1 and watch the distribution collapse to a single contestant. k=1 is exactly this gate's extreme form: only the leader survives, the effect is equivalent to greedy decoding, and randomness is switched off entirely. Waste in the other direction deserves attention too: when the distribution is sharp, nearly all probability mass sits at the head, so however large k gets, what you let in are merely escorts with near-zero probability — extra entry points for long-tail noise.

## top-p: dynamic accumulation

top-p (also called nucleus sampling) cuts at a different angle: start accumulating from the highest-probability token, seal the list once the running sum reaches p, discard everything after the seal, and renormalize the survivors. The difference from top-k is that the candidate count is dynamic: when the distribution is sharp, the top two or three may already carry 95% of the probability mass and only a few survive; when it is flat, the list widens automatically — it draws the line by "probability mass" rather than by "quota". The cost is less intuitive behavior: for the same p, the candidate count differs completely at different temperatures, so the two parameters couple. In practice you usually pick one or combine mild values rather than tightening both to the extreme. p=1 is an identity boundary: the running sum only reaches 1 after walking the entire vocabulary, which amounts to no cutoff at all. The coupling with temperature can be made one step more concrete: for the same logits, a low temperature packs probability mass into the head and the seal lands early, while a high temperature flattens the mass and the same p must widen to more candidates — tune one parameter and the other's effective behavior shifts with it.

## The combo, and engineering practice

In HuggingFace transformers' default implementation the three parameters run in a fixed order (other engines such as vLLM or TGI may order them differently):

- temperature scaling first (softmax(logit/T))
- then the top-k cutoff
- then the top-p cumulative cutoff and renormalization — which is also the computation order this page's demo uses

Tuning intuition splits by task: writing and brainstorming want high temperature (0.8–1.2) with a loose top-p to buy variety in phrasing; code generation, extraction, and structured output want low temperature (0–0.3) or even pure greedy decoding for stability and reproducibility. Most APIs default to 1.0 when temperature is not passed; remember that tuning these parameters changes only "the distribution you draw from", never the capability of the model itself. A common counter-example is tightening top-k and top-p at the same time: with both gates stacked, the candidates can be cut down to one or two, diversity drops to zero, and the setup degrades into a disguised greedy decoder. The pipeline order is not a trivial detail either — temperature first means the cutoffs act on an already-sharpened or already-flattened distribution; reverse the order and the line is drawn somewhere completely different, so before comparing parameters against another engine's documentation, confirm its order first.

> **Three things to take away**
>
> A logit is not a probability: before softmax everything is still a deterministic score, and the randomness lives only in the final draw from the distribution.
>
> Temperature changes the sharpness of the distribution: below 1 it pulls probability mass onto the head and output becomes reproducible; above 1 it flattens the tail — more variety, more drift.
>
> top-k cuts by head count, top-p by probability mass: both change how many candidates survive and what renormalization yields, so in practice you pick one, or keep both at gentle settings.

## About the demo data

This lesson reuses the same demo as its Chinese counterpart (`e03-sampling`) on purpose: its two prompt sets are already bilingual, and the candidate tokens are shown exactly as a model's vocabulary would produce them. The logits — 12 candidates in each of the two prompt sets, with top values of 8.2 and 8.0 — are illustrative teaching data (not real model output); the computed distributions, though, are produced live by the same temperature → top-k → top-p → renormalize pipeline described above.
