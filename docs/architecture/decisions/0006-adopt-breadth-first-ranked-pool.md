# ADR 0006: Adopt a breadth-first ranked recommendation pool

- Status: Accepted
- Date: 2026-08-18
- Owners: Project team
- Supersedes: ADR 0005 retrieval, reranking, and session behaviour

## Context

The relevance-first pipeline improved the first five recommendations, but its
three mutually exclusive discovery lanes could reduce ordinary requests to
fewer than ten titles. It also treated story setting as production origin,
discarded candidates that missed a soft preference, and ranked only a small
enriched shortlist. Consequently a viewer could exhaust a credible TMDB query
after one batch even when the catalogue contained hundreds of suitable films.

The product still presents five decisive choices at a time. Breadth belongs in
the underlying recommendation pool, not in a catalogue-style interface.

## Decision

### Intent and constraints

- Intent distinguishes hard provider constraints, soft semantic preferences,
  and retrieval hints.
- Production nationality uses explicit ISO 3166-1 country codes. Story setting
  remains a semantic preference and never silently becomes a production filter.
- Positive genres use inclusive discovery semantics. Multiple genres express
  useful alternatives unless a future intent field explicitly represents a
  genre conjunction.
- Rating/vote floor, exclusions, date, runtime, language, production origin,
  and explicitly named cast remain hard constraints. Missing mood, tone, theme,
  setting, style, or cast-shape evidence lowers rank but does not delete a film.

### Retrieval and ranking

- Every new search runs a broad backbone of three popularity-sorted and two
  vote-count-sorted TMDB Discover pages with the hard constraints applied.
- Keyword and reference-cast lanes are additive. They can improve evidence and
  source agreement but never replace broad retrieval.
- Results are deduplicated and pre-ranked into a 60-candidate enrichment
  shortlist, allowing hard validation against detailed metadata to still yield
  a ranked pool of up to 50 films. The 6.2 rating and 100-vote catalogue floor
  remains in place.
- The complete pool is enriched once with TMDB details, credits, keywords,
  certifications, and UK watch availability.
- Hard-valid movies receive one stable global score: 65% squared intent
  confidence, 30% Bayesian rating/vote confidence, and 5% discovery-source
  agreement. Squaring the normalised relevance value prevents a strong rating
  from overtaking a materially better brief match while keeping soft misses in
  the pool. A relevance lead of 15 points or more is protected before the
  blended score is compared. Popularity and vote count only break ties.
- The synchronous model reranking call is removed. Structured Outputs still
  interprets the brief, while bounded deterministic code performs the
  auditable filtering, joining, and ranking work.

### Batching and state

- The API returns the first five films plus the remaining globally ranked,
  enriched pool.
- The browser stores that pool in session storage and serves successive groups
  of five without another OpenAI request, TMDB discovery, enrichment, or
  reranking call.
- After each group the viewer can reveal the next five or refine the prompt.
  A genuinely narrow hard-constrained search may contain fewer than 50 films;
  the application does not silently relax explicit constraints to hide that.

## Consequences

- Basic requests with adequate TMDB coverage retain up to 50 credible options
  while preserving the focused five-at-a-time experience.
- Continuation batches are instantaneous and retain the original global order.
- Initial responses are larger and may perform up to 50 parallel TMDB detail
  requests, but removing synchronous model reranking reduces latency variance.
- The browser session contains public movie metadata rather than only unused
  IDs. No durable profile or server-side search history is introduced.
- Ranking behaviour is reproducible and can be covered with prompt and
  catalogue fixtures. Model prompt changes should still be checked against the
  representative regression set.

## Alternatives considered

### Loosen filters only when the pool is small

Rejected because silent relaxation makes explicit constraints unreliable and
creates discontinuous ranking behaviour. Broad retrieval is always present;
only soft preferences are allowed to degrade gracefully.

### Fetch another TMDB search after every five films

Rejected because it adds latency, can repeat titles, and allows rankings to
shift between batches. One stable pool makes continuation predictable.

### Keep synchronous semantic reranking

Rejected for the request path because it repeatedly consumed most of the
latency budget and could still delete useful candidates. The model remains
valuable for structured intent extraction, while deterministic processing is a
better fit for bounded catalogue ranking.
