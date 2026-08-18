# ADR 0005: Adopt relevance-first candidate reranking

- Status: Accepted
- Date: 2026-08-18
- Owners: Project team
- Supersedes: ADR 0003 sections “Quality policy”, “Exclusions and session
  behavior”, and “Recommendation presentation”

## Context

The original pipeline converted a brief into broad TMDB Discover filters and
then ranked one response page mainly by rating confidence. This worked for
literal genre requests, but semantic requests were regularly overwhelmed by
highly rated incidental matches. Examples included _The Shawshank Redemption_
for “a sexy film”, _Kingsman_ for “a chick flick set in the UK”, and _Parasite_
for an ensemble comedy like _Anchorman_.

The product should optimise for confidence in a small number of choices, not
for the size or average rating of a queue.

## Decision

### Intent

- OpenAI Structured Outputs separates required genres and other hard
  constraints from preferred genres and typed preferences for mood, tone,
  theme, setting, cast, pace, and style.
- Every preference records whether it is primary or secondary and explicit or
  inferred. Reference films also carry the traits that should transfer.
- A small deterministic normalization layer collapses duplicated or truncated
  expressions of known concepts into one auditable preference before retrieval;
  for example, twist variants become `plot twist`.
- Setting, named cast members, cast shape, and subjective language such as
  “sexy” remain explicit intent instead of being flattened into a broad genre.
- Known ambiguous phrases are expanded conservatively. For example, “chick
  flick” adds romance, comedy, and female-relationship retrieval signals while
  preserving an explicit UK setting as a primary criterion.

### Retrieval and enrichment

- TMDB discovery uses up to three targeted lanes across focused,
  keyword-oriented, genre-oriented, and broad retrieval. Results are
  deduplicated into a reusable pool of at most 60 IDs.
- Keyword resolution is limited to the four strongest terms. Keyword and
  discovery requests settle independently, so one transient TMDB failure does
  not discard useful results from the other lanes.
- Named actors are resolved through TMDB person search and applied as cast
  discovery constraints. A “similar cast” request resolves the reference
  film's lead cast and uses cast overlap for both retrieval and grading.
- Discovery uses a permissive quality floor of 6.2 from 100 votes. This floor
  protects against unsupported catalogue entries without excluding relevant
  niche films before relevance is assessed.
- A deterministic pre-ranker selects twelve candidates using intent signals,
  rating confidence, source agreement, and a small popularity contribution.
- Those twelve are enriched in parallel with details, keywords, credits, UK
  release certification, and UK watch providers.

### Reranking and presentation

- A second bounded Structured Outputs request grades only supplied TMDB
  candidates. It cannot invent titles, and its rationale must cite supplied
  evidence.
- Hard-constraint conflicts are rejected. Semantic relevance contributes 82%
  of the final score and deterministic pre-ranking contributes 18%; ratings and
  popularity therefore cannot rescue an intent mismatch.
- A deterministic evidence scorer is used if semantic reranking fails.
- If semantic grading underfills the shortlist, the same evidence scorer
  supplements it with catalogue-supported matches; it still enforces every hard
  constraint and confidence threshold.
- If fewer than five confident recommendations survive, candidates from the
  already-discovered pool are enriched and graded in twelve-film increments,
  stopping as soon as the programme is full or 48 candidates have been
  assessed. This bounded fill step aims to deliver a complete five-film
  programme without a second discovery request.
- The evidence scorer recognises high-confidence catalogue concepts such as a
  `plot twist` keyword without requiring the candidate metadata to repeat a
  longer natural-language preference verbatim. The same conservative concept
  expansion is used by the pre-ranker so candidates described with phrases such
  as “unexpected turn” reach enrichment before generic popular genre matches.
- Provider retries are disabled inside the request path and each provider call
  has a short timeout. Semantic reranking is skipped when too little of the
  25-second application budget remains; the deterministic scorer then returns
  the best available result instead of extending the wait.
- Return five candidates above the confidence floor whenever the catalogue can
  support them. All are enriched before the first reveal so “Try another film”
  is instantaneous. A genuinely underfilled programme is labelled with its
  actual size rather than presented as “1/5”.
- After five rejections, offer either a refined prompt or another batch. Another
  batch enriches and reranks unused IDs from the original pool and never repeats
  TMDB discovery or intent interpretation.

### Privacy and state

- Both OpenAI requests use `store: false`. The reranker receives validated
  intent plus public TMDB metadata, not the original free-text prompt.
- Server logs record a random request ID, stage durations, candidate counts,
  and fallback strategy. Prompt text and interpreted preference values are not
  logged.
- The browser stores the five recommendations and unused TMDB IDs in session
  storage. No durable server-side profile or history is introduced.

## Alternatives considered

### Raise the rating threshold

Rejected because rating confidence is not semantic relevance and further
favours popular incidental matches.

### Ask the language model to generate movie titles

Rejected because generated titles can be unavailable, hallucinated, or
difficult to audit. The model may grade only live TMDB candidates.

### Run a fresh discovery request after every five films

Rejected because it repeats the most expensive retrieval step and can surface
duplicates. The original pool is intentionally large enough for another batch.

## Consequences

- Initial searches still make parallel TMDB detail calls and normally make a
  second model call, but the bounded shortlist and fallback budget constrain
  first-result latency and provider cost.
- Skipping within a five-film programme requires no network request.
- Match explanations become evidence-based, and relevance regressions can be
  tested independently of live providers.
- Candidate and prompt fixtures must be maintained as the intent vocabulary
  evolves.

## Follow-up

- Track first-choice acceptance, five-film exhaustion, and refine rates without
  retaining prompt text.
- Expand the regression set from real user misses and compare model/effort
  changes against it before deployment.
- Revisit the twelve-candidate shortlist, bounded fill limit, and 55-point
  confidence floor with production acceptance data.
