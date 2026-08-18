# ADR 0001: Adopt the House Lights Down design system

- Status: Accepted
- Date: 2026-08-18
- Owners: Project team

## Context

Movie Night needs to help people choose one film without recreating the visual
and cognitive overload of streaming catalogues. The creator's reference images
combine two useful cinema environments: a high-contrast illuminated “Now
Showing” board and a dark, warm auditorium focused on one screen.

The application framework has not been selected, so the visual language must be
portable and documented independently of a component library.

## Decision

Adopt **House Lights Down** as the initial design system.

- Preference gathering uses an illuminated programme-board metaphor.
- Recommendation reveal uses a dark auditorium and warm cinema-screen metaphor.
- The transition between those environments is the signature brand moment.
- The canonical implementation values are framework-independent CSS custom
  properties in `src/styles/tokens.css`.
- The default palette uses oxblood velvet, plum-tinted dark neutrals, cream
  marquee light, signal red, and restrained brass.
- Anton is the display face and Commissioner is the interface face, subject to
  production font loading and licence verification when the application is
  implemented.
- Accessibility and reduced-choice product behavior constrain the metaphor.

## Alternatives considered

### Generic streaming-service dark theme

Familiar, but it would encourage poster grids and make the product visually
indistinguishable from the services whose browsing problem it is trying to
solve.

### Full vintage skeuomorphism

Literal curtains, ticket shapes, bulbs, reels, and distressed textures would be
memorable but could reduce legibility, age quickly, and turn core controls into
a novelty.

### Bright editorial recommendation guide

Clear and flexible, but it loses the evening viewing context and the dramatic
single-recommendation reveal supported by the reference material.

## Consequences

- Two surface contexts need distinct semantic text and action tokens.
- Application components must work on both illuminated and auditorium surfaces.
- The primary journey must avoid endless recommendation grids.
- Motion implementation needs a reduced-motion equivalent.
- Font files and licences will need to be added and optimised during application
  implementation.
- The system should be user-tested to ensure the cinema metaphor feels focused,
  not theatrical at the expense of speed.

## Follow-up

- Verify all production colour pairings with automated and manual contrast
  checks.
- Prototype the preference-to-recommendation transition with representative
  users.
- Define production component APIs after the frontend framework is selected.
- Confirm font subsets, metric overrides, and self-hosting policy.
