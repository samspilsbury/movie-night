# Design

Movie Night's visual and interaction language is **House Lights Down**: a
framework-independent design system inspired by illuminated cinema programme
boards and the transition from a bright foyer to a dark auditorium.

- `design-system.md`: foundations, components, responsive behavior, motion, and
  accessibility rules.
- `specimen.html`: the original standalone visual reference. The production MVP
  in `src/app/` is authoritative for the current free-text interaction.
- `specimen.css`: preview-only styles; production components should consume the
  canonical tokens in `src/styles/tokens.css`.

Future user journeys, research summaries, content guidance, and links to source
design files also belong here. Exported production assets belong under
`public/assets/`, not in this directory.

Design work should support the product promise: reach a confident movie choice
quickly. Document the reasoning behind interaction patterns so later changes can
be evaluated against user needs rather than visual preference alone.
