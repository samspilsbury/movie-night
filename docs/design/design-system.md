# House Lights Down

Movie Night design system, version 0.1.

## Direction

House Lights Down translates the emotional sequence of going to the cinema into
a focused decision flow:

| Product phase       | Cinema metaphor      | Visual behavior                           |
| ------------------- | -------------------- | ----------------------------------------- |
| Describe the mood   | Theatre exterior     | Warm, theatrical, singular, legible       |
| Prepare result      | House lights dimming | Calm transition with explicit status      |
| Show recommendation | Feature presentation | Dark, spacious, cinematic, singular       |
| Ask for another     | Programme change     | Quiet secondary action; choices preserved |

This is not a novelty skeuomorph. Cinema details establish hierarchy and mood;
native controls, semantic HTML, and familiar interaction patterns preserve
usability.

## Principles

### One feature, not a catalogue

The reveal gives visual dominance to one recommendation. Related films, trending
rows, and infinite poster grids do not belong in the primary journey.

### Light directs attention

Cream illuminated surfaces identify the current decision. Oxblood and
plum-black surfaces recede. Brass is structural and decorative. Signal red is
reserved for primary action and selected marquee lettering.

### The theatre changes state

The transition from marquee to screen should feel like moving from foyer light
to auditorium darkness. It must also make sense with motion disabled.

### Nostalgia, edited

Use letter-board rules, condensed type, velvet colour, brass lines, and screen
proportions. Avoid film-reel clip art, popcorn icons, literal curtains around
every panel, distressed overlays on text, or faux ticket stubs used without a
functional reason.

## Colour

The canonical values live in `src/styles/tokens.css`. All colours use OKLCH so
lightness changes are perceptually predictable.

### Palette roles

| Role              | Token                     | Intended use                                    |
| ----------------- | ------------------------- | ----------------------------------------------- |
| Auditorium        | `--color-surface-canvas`  | Page canvas and reveal environment              |
| Raised auditorium | `--color-surface-raised`  | Navigation and distinct dark regions            |
| Velvet            | `--color-velvet`          | Architectural fields and selected dark controls |
| Marquee           | `--color-surface-marquee` | Input board and cinema screen                   |
| Ink               | `--color-text-on-marquee` | Copy and controls on illuminated surfaces       |
| Signal red        | `--color-action-primary`  | Primary action and current selection            |
| Brass             | `--color-accent-brass`    | Frames, dividers, progress, and focus support   |

Use the palette with approximately 60% auditorium neutral, 30% text and
structural surfaces, and 10% red/brass accent by visual weight. Brass is never a
substitute for body text on cream, and red must not be the only selected-state
indicator.

### Verified representative contrast

Ratios were calculated from the canonical OKLCH values on 2026-08-18. Recheck
rendered components whenever tokens, font weights, or surface pairings change.

| Foreground / background            |   Ratio |
| ---------------------------------- | ------: |
| Primary auditorium text / canvas   | 15.48:1 |
| Secondary auditorium text / canvas | 11.56:1 |
| Ink / marquee                      | 17.63:1 |
| Signal red / marquee               |  8.03:1 |
| Cream text / signal-red action     |  8.03:1 |
| Brass / auditorium canvas          |  8.10:1 |
| Cream text / velvet                | 11.28:1 |

### Surface rules

- Depth on dark surfaces comes from a slightly lighter plum value, not a large
  generic shadow.
- The marquee surface may use a controlled warm glow because it represents a
  physical light source.
- Do not place muted grey text on velvet. Use the corresponding pale plum text
  token.
- Do not use pure black or pure white.

## Typography

The typographic voice is **decisive, theatrical, and tactile**—like changeable
letters in a physical programme case paired with a well-made cinema guide.

### Families

- **[Anton](https://github.com/google/fonts/tree/main/ofl/anton)** is the display face for the wordmark, board headings, movie titles,
  and very short labels. It reworks a traditional advertising sans for modern
  screens, which closely matches the programme-board reference.
- **[Commissioner](https://github.com/kosbarts/Commissioner)** is the body and interface face. Its humanist proportions and
  variable weights add warmth without becoming decorative.
- Fallbacks are defined in the token file. Production should self-host
  subsetted WOFF2 files, include their SIL Open Font License files, and add
  metric overrides to minimise layout shift.

### Scale and usage

| Role    | Token            | Guidance                                          |
| ------- | ---------------- | ------------------------------------------------- |
| Caption | `--text-caption` | Supporting metadata; never essential instructions |
| Label   | `--text-label`   | Controls and short board labels                   |
| Body    | `--text-body`    | Default copy; minimum 1rem                        |
| Lead    | `--text-lead`    | Recommendation rationale and introductions        |
| Heading | `--text-heading` | Section headings and preference questions         |
| Feature | `--text-feature` | Movie title and major programme statement         |

Display text is uppercase only when it is short. Body copy remains sentence
case. Use tabular numbers for runtimes, years, ratings, and counts. Keep reading
measure at or below `--measure-reading`.

Anton must use `--leading-display` or a looser line-height. Never tighten it
below `0.96`: its tall glyphs visibly collide across wrapped lines. For large
stacked statements, place each intended line in a block-level span and keep each
word unbroken. Movie titles may wrap naturally and use `overflow-wrap` only as a
last resort for unusually long words.

## Space, shape, and structure

- Spacing follows a 4px-derived scale: 4, 8, 12, 16, 24, 32, 48, 64, and 96px.
- Most controls and panels are square or barely softened. Large rounded cards
  conflict with the physical cinema architecture.
- Marquee rows use one-pixel rules and generous internal space rather than cards
  nested inside cards.
- The screen uses a `16 / 9` aspect ratio when space allows. On small phones it
  becomes an auto-height composition so content is never clipped or shrunk.
- Controls meet a minimum 44px target even when their visible lettering is
  compact.

## Components

### Cinema shell

The global environment. It supplies auditorium canvas, safe-area padding, a
restrained ceiling-light motif, and a maximum content width. Decorative ceiling
lights must be hidden from assistive technology and should disappear in forced
colour modes.

### Theatre exterior and marquee

The natural-language movie-brief surface.

- Present the homepage as one stylised theatre exterior, with a dusk skyline,
  restrained searchlights, a dark art-deco facade, marquee bulbs, and a short
  red-carpet threshold. These elements form one scene rather than separate
  decorative widgets.
- Place “Now Showing” on the theatre's main venue sign, in the position normally
  occupied by the theatre name.
- Put the product question and real multiline text field inside the illuminated
  marquee. The field must feel physically embedded in the board rather than
  placed in a form card below it.
- The marquee contains only the masthead, example prompt, and primary action.
  Do not add programme metadata, instructional copy, character counts, trust
  claims, or concession-style footer rows to this first decision.
- Use a real `<form>`. Associate the visible theatre-sign question with the text
  field programmatically; a visually hidden native label remains as a fallback.
- Use the placeholder only as a concrete example of useful input. It teaches
  mood, genre, a reference film, and runtime without adding separate directions.
- Enter submits the brief and Shift + Enter inserts a new line.
- Keep text-bearing controls on an uninterrupted cream surface and reserve the
  surrounding red, brass, and shadow values for the theatre architecture.

### Film-leader countdown

The loading state recalls a traditional cinema leader without delaying the API
request.

- Begin the real request immediately.
- Use a short circular 3–2–1 sequence, then retain the composition with an
  honest status message if the response is still pending.
- Announce the status through a polite live region.
- With reduced motion, remove the rotating sweep and keep the status copy.
- Never show fake percentages or imply a pipeline step completed when it did
  not.

### Feature action

The primary action appears once per view and uses a signal-red field with cream
lettering. Preferred copy is outcome-specific: **Find tonight's film**. Do not
use “Submit,” “Continue,” or “Generate.”

### Screen stage

The recommendation environment. Dark architectural space surrounds one warm
screen. The screen holds:

1. A short eyebrow such as “Tonight's feature”.
2. Movie title as the dominant element.
3. Year, runtime, content rating, and one or two useful availability facts.
4. A concise “why this fits” explanation tied to the interpreted brief.
5. One primary next step, such as “See where to watch”.
6. A quiet secondary action, “Try another film”.

The poster is supporting evidence, not the reveal itself. If used, give it a
fixed aspect ratio and meaningful alt text only when it conveys information not
already present.

Recommendation summaries use lead-size body type on the illuminated screen.
Metadata and availability labels never drop below the label size or rely on a
light font weight for hierarchy.

### Programme change

“Try another film” preserves the user's brief and replaces only the
recommendation without another loading transition. After five films, present a
clear end-of-programme choice: rerank unused candidates from the same search or
refine the brief. This protects the product from becoming another doom scroll.

When another enriched recommendation is ready, a brief popcorn curtain masks
the visual swap. It is decorative, never communicates required information,
does not trigger on the first reveal or the end-of-programme screen, and is
removed entirely when reduced motion is requested.

### Status and recovery

| State         | Preferred copy                     | Behavior                                     |
| ------------- | ---------------------------------- | -------------------------------------------- |
| Preparing     | “Dimming the house lights…”        | Begin the request; preserve the movie brief  |
| Slow response | “Finding a film that fits…”        | Add progress detail without fake percentages |
| No match      | “Nothing fits every choice yet.”   | Offer to relax one named constraint          |
| Network error | “We couldn't reach the programme.” | Offer “Try again” and retain answers         |
| Replacement   | “Changing the programme…”          | Keep the screen frame stable                 |

Error copy is calm and literal. Cinema language may set context but must never
hide what happened or how to recover.

## Motion

The signature transition is a single three-beat sequence:

1. Marquee content fades out over `--duration-moderate-exit`.
2. A compact film-leader countdown appears while the real request runs.
3. The screen content fades and rises no more than 8px over
   `--duration-cinematic`.

Animate only opacity and transform. Button feedback uses the fast duration;
ordinary state changes use the moderate duration. Do not animate curtain panels,
add projector flicker, or make controls bounce.

With `prefers-reduced-motion: reduce`, crossfade in place in under 150ms. Status
announcements and focus movement still communicate the state change.

## Responsive behavior

### Compact

- The theatre reaches near the viewport edges. Its sign, bulb frame, entrance,
  and skyline simplify in scale without changing the reading order.
- The marquee's heavy outer frame reduces to preserve content space.
- The movie brief field and primary action use the full available width.
- The feature screen becomes auto-height; title, metadata, rationale, and actions
  follow in one column.
- Primary actions may span the available width. Secondary actions remain visible.

### Wide

- The theatre stays constrained and centred as a single exterior scene.
- The screen may use an asymmetric grid with movie information occupying more
  width than secondary metadata.
- Auditorium space should grow around the screen rather than filling it with
  more recommendations.

Use component container queries for marquee choices and recommendation layout.
Use viewport queries only for the page architecture. Support safe-area insets and
never hide essential actions on touch devices.

## Accessibility requirements

- Meet WCAG 2.2 AA: 4.5:1 for body copy and 3:1 for large text, controls, and
  focus indicators.
- Test the actual token pairings before release; do not infer compliance from
  palette names.
- Use native form controls and document structure before adding ARIA.
- Use `:focus-visible`; never remove an outline without a replacement.
- Focus colour is surface-aware: brass on auditorium surfaces and dark ink on
  illuminated marquee surfaces. Both must retain at least 3:1 contrast against
  the immediately adjacent colour.
- Keep touch targets at least 44 by 44 CSS pixels.
- Never use a placeholder as a label.
- Announce asynchronous status through an appropriate live region without
  repeatedly interrupting the user.
- Preserve browser zoom and ensure the journey works at 200% zoom.
- In forced-colour mode, remove decorative backgrounds and retain borders,
  labels, and native checked states.
- Test with keyboard only, VoiceOver, NVDA, reduced motion, colour-vision
  emulation, one iPhone, and one Android device before launch.

## Token ownership

`src/styles/tokens.css` is the single source of truth for implementation values.
The standalone specimen is illustrative and may contain preview-only layout
styles. When a token changes, update this document and the specimen in the same
change.
