# ADR 0003: Adopt the live recommendation pipeline

- Status: Accepted
- Date: 2026-08-18
- Owners: Project team

## Context

Movie Night should interpret one natural-language statement, find a small set of
good matching films without maintaining its own catalogue, and reveal those
films one at a time. A user may ask for another film, but the product must not
turn into an endless browsing surface.

The first release targets the United Kingdom, may include adult films, and may
recommend films available by subscription, free streaming, advertising, rental,
or purchase. Any film mentioned by the user and all films in its TMDB collection
must be excluded from recommendations.

## Decision

### Sources and interpretation

- Use the OpenAI Responses API with strict Structured Outputs to translate the
  user's statement into an allowlisted recommendation intent. The model never
  constructs or executes a provider URL.
- Validate the model output again on the server before mapping it to TMDB
  filters.
- Use TMDB Discover for candidates and TMDB movie details for metadata,
  certification, credits, collection information, and UK watch providers.
- Attribute TMDB and JustWatch in the product as required by their terms.
- Combine positive genre preferences with TMDB's `OR` syntax so the initial
  queue is not reduced to films carrying every inferred genre. Ranking rewards
  candidates that match more of the preferred genres. Explicitly excluded
  genres remain hard exclusions.

### Quality policy

Searches progress in this order, and only when the current eight-film queue is
exhausted:

| Stage            | Minimum TMDB rating | Minimum vote count | Purpose                       |
| ---------------- | ------------------: | -----------------: | ----------------------------- |
| Strict           |                 7.2 |                500 | Initial queue                 |
| Lower vote floor |                 7.2 |                200 | Preserve rating quality first |
| Broader          |                 6.8 |                200 | Soften the rating threshold   |
| Niche fallback   |                 6.5 |                 75 | Last constrained fallback     |

Within a response page, candidates are ranked using rating confidence, criteria
match, and a modest popularity signal. Only the best eight unseen films are
retained.

### Exclusions and session behavior

- Resolve explicitly mentioned films through TMDB search.
- Exclude the exact film and every part returned by its TMDB collection.
- Keep referenced, shown, and queued movie IDs in session storage. No account or
  durable server-side session is required.
- When the queue is exhausted, reuse the already validated intent, advance one
  quality stage, and exclude every previously referenced or shown ID.
- Explicit genre, language, year, and runtime exclusions are never relaxed
  automatically.

### Recommendation presentation

- Display one recommendation at a time.
- Always display a UK content-rating field, including an explicit
  “UK rating unavailable” state when TMDB has no certification.
- Show UK streaming, free/ad-supported, rental, and purchase availability when
  present. Availability is informational and is not a mandatory search filter.
- Enrich only the currently displayed candidate rather than all eight results.
- Generate the short match explanation from validated intent and TMDB metadata;
  do not make a second language-model request.

### Privacy and resilience

- Keep both API credentials server-side.
- Send only the user's movie-preference statement to OpenAI and request no
  reusable response state.
- Do not persist prompts or recommendation history in the MVP.
- Provide deterministic demo data for local UI development, automated tests,
  and provider outages. Demo mode must be explicit and visibly labelled.

## Alternatives considered

### Rating average without vote count

Rejected because a high rating based on very few votes is not a dependable
quality signal.

### Fetch and enrich every candidate immediately

Rejected because most sessions will not need details for all eight films.

### Ask the language model to recommend titles directly

Rejected because it could hallucinate availability or metadata, would make
quality thresholds difficult to audit, and would not provide live catalogue
data.

### Require streaming availability

Rejected for the MVP. The user accepted any availability type, including rental
and purchase.

## Consequences

- A first live search usually makes one OpenAI call plus several TMDB calls for
  intent resolution, referenced-film exclusion, candidate discovery, and the
  first result's details.
- Some films will have incomplete UK certification or provider information; the
  UI must label that absence clearly.
- TMDB collection membership is the definition of a sequel family for the MVP.
  Remakes outside a collection are not automatically excluded.
- Thresholds are product policy and can be tuned without changing the intent
  schema.

## Follow-up

- Evaluate the thresholds against representative prompts and record acceptance
  rates by genre before changing them.
- Confirm the required TMDB and JustWatch attribution visually before launch.
- Add request throttling and operational monitoring before public deployment.
