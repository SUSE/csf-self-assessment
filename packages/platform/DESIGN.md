---
name: Cloud Sovereignty Self-Assessment
description: A calibrated instrument for reading sovereignty exposure — dense, flat, and legible under eight palettes in light and dark.
colors:
  pine: "oklch(0.288 0.043 180.7)"
  fog: "oklch(0.952 0 0)"
  fog-shade: "oklch(0.932 0 0)"
  white: "oklch(1 0 0)"
  jungle: "oklch(0.7005 0.1508 157.26)"
  mint-palest: "oklch(0.973 0.017 188)"
  mint-tint: "oklch(0.925 0.045 170)"
  neutral-ink: "oklch(0.438 0 0)"
  hairline: "oklch(0.894 0 0)"
  persimmon: "oklch(0.53 0.179 33.6)"
  persimmon-wash: "oklch(0.966 0.013 35)"
  act-here-amber: "oklch(0.76 0.15 70)"
  act-here-ink: "oklch(0.27 0.05 70)"
  gauge-ink-0: "oklch(0.86 0.04 157.26)"
  gauge-ink-1: "oklch(0.78 0.08 157.26)"
  gauge-ink-2: "oklch(0.7 0.12 157.26)"
  gauge-ink-3: "oklch(0.61 0.16 157.26)"
  gauge-ink-4: "oklch(0.52 0.2 157.26)"
  gauge-fill-0: "oklch(0.94 0.018 157.26)"
  gauge-fill-1: "oklch(0.876 0.045 157.26)"
  gauge-fill-2: "oklch(0.812 0.075 157.26)"
  gauge-fill-3: "oklch(0.735 0.105 157.26)"
  gauge-fill-4: "oklch(0.65 0.14 157.26)"
  series-teal: "oklch(0.716 0.13 180.5)"
  series-indigo: "oklch(0.477 0.116 290)"
  series-sky: "oklch(0.789 0.083 224.8)"
  series-lilac: "oklch(0.862 0.084 316.3)"
  series-peach: "oklch(0.877 0.055 34.9)"
typography:
  display:
    fontFamily: "SUSE, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "normal"
  headline:
    fontFamily: "SUSE, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  title:
    fontFamily: "SUSE, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "normal"
  reading:
    fontFamily: "SUSE, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.625
    letterSpacing: "normal"
  body:
    fontFamily: "SUSE, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  control:
    fontFamily: "SUSE, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "normal"
  label:
    fontFamily: "SUSE, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.025em"
  caption:
    fontFamily: "SUSE, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
  mono:
    fontFamily: "SUSE Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  part: "0.25rem"
  sm: "0.25rem"
  md: "0.375rem"
  lg: "0.5rem"
  xl: "0.75rem"
  full: "9999px"
spacing:
  "0.5": "0.125rem"
  "1": "0.25rem"
  "1.5": "0.375rem"
  "2": "0.5rem"
  "3": "0.75rem"
  "4": "1rem"
  "6": "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.jungle}"
    textColor: "{colors.pine}"
    typography: "{typography.control}"
    rounded: "{rounded.lg}"
    padding: "0 0.625rem"
    height: "2rem"
  button-outline:
    backgroundColor: "{colors.fog}"
    textColor: "{colors.pine}"
    typography: "{typography.control}"
    rounded: "{rounded.lg}"
    padding: "0 0.625rem"
    height: "2rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.pine}"
    typography: "{typography.control}"
    rounded: "{rounded.lg}"
    padding: "0 0.625rem"
    height: "2rem"
  button-ghost-hover:
    backgroundColor: "{colors.fog-shade}"
    textColor: "{colors.pine}"
  button-destructive:
    backgroundColor: "color-mix(in oklab, oklch(0.53 0.179 33.6) 10%, transparent)"
    textColor: "{colors.persimmon}"
    typography: "{typography.control}"
    rounded: "{rounded.lg}"
    padding: "0 0.625rem"
    height: "2rem"
  input:
    backgroundColor: "{colors.fog}"
    textColor: "{colors.pine}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.75rem"
    width: "100%"
  input-invalid:
    backgroundColor: "{colors.fog}"
    textColor: "{colors.pine}"
    rounded: "{rounded.md}"
  card:
    backgroundColor: "{colors.white}"
    textColor: "{colors.pine}"
    rounded: "{rounded.lg}"
    padding: "1rem"
  tile:
    backgroundColor: "{colors.white}"
    textColor: "{colors.pine}"
    rounded: "{rounded.lg}"
    padding: "1rem"
    height: "100%"
  ladder-rung:
    backgroundColor: "transparent"
    textColor: "{colors.pine}"
    rounded: "{rounded.lg}"
    padding: "0.75rem 0.5rem"
  ladder-rung-selected:
    backgroundColor: "{colors.mint-palest}"
    textColor: "{colors.pine}"
    rounded: "{rounded.lg}"
    padding: "0.75rem 0.5rem"
  gauge-badge:
    backgroundColor: "{colors.gauge-fill-2}"
    textColor: "{colors.gauge-ink-2}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    size: "2rem"
  detail-field-readonly:
    backgroundColor: "{colors.fog-shade}"
    textColor: "{colors.neutral-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.part}"
    padding: "0.25rem 0.5rem"
---

# Design System: Cloud Sovereignty Self-Assessment

## Overview

**Creative North Star: "The Calibrated Instrument"**

This is not a document that displays data — it is a measuring device that a room of people read together, under time pressure, and then defend to a reviewer afterwards. Every mark on the surface is a reading. The radial wheels are dials, the 0→4 ramp is a gauge face, the ladder is a scale you descend one rung at a time, and the merge ledger is the instrument's tape. The consequence is severe and simple: **a decorative mark on an instrument is a misreading waiting to happen**, so there are none. Nothing here is styled for the pleasure of styling it.

The register is composed and workshop-warm rather than clinical. This surface exists to be looked at by six people crowded round one screen while a facilitator reads a question aloud, and it behaves like a good tool in that room: quiet, dense, legible at a glance, and never demanding attention it hasn't earned. Warmth comes from the Fog canvas and the deep Pine ink — a soft, low-glare pairing, not a white page with black text — and from copy that says what it means. Severity comes from the arithmetic, not the styling.

The system is honest about ignorance in the way it *looks*, not just in what it computes. A floor is never shown without its unknown count beside it, because they are one value. Absence renders as an em-dash and a sentence, never as a zero. And because the whole token layer switches on two independent axes — mode × palette, eight palettes deep — no visual decision is allowed to depend on a particular hue being present. A design that only works in green is a design that works two-eighths of the time.

**Key Characteristics:**
- **Extreme density, deliberately.** 422 of 450 type sizes in the codebase are `text-xs` or `text-sm`. Anything larger is a claim.
- **Flat at ground level.** Not one surface in the document flow casts a shadow.
- **Hairline-ruled.** Borders and one-step tonal lift do all the separating that shadows would elsewhere.
- **Two-axis themeable.** Mode × palette, both classes on `<html>`, eight palettes shipping — four hand-authored brand pairs (SUSE, Pine & Mint, Fog Editorial, Instrument) and four imported presets.
- **One ordinal ramp, one hue.** Order is readable from intensity alone, never from hue identity.
- **Keyboard-first.** Digits place a rung, `u` is don't-know, `n` is n/a, `Enter` advances.
- **Viewport-bounded.** The page itself never scrolls. Every region owns its own scroll.

## Colours

A soft, low-glare brand core — deep blue-green ink on a warm grey canvas — carrying exactly one action colour, one alarm colour, one attention colour, and one ordinal ramp. Nothing else is allowed a hue.

### Primary
- **Jungle** (`--primary`, `--ring`): the action colour, and only ever as a *fill* — a filled button, a focus ring, the logo mark's tile. The brand guide classes it "graphics only" on both light surfaces, so it is never body text. It carries Pine text on it (5.5:1), never white.
- **Pine** (`--foreground`): the ink in light mode and the entire canvas in dark mode. The one colour that changes job between modes rather than changing value.

### Secondary
- **Fog** (`--background`) and **White** (`--card`, `--popover`, `--sidebar`): the two-step surface stack in light mode. A card is White lifted off a Fog page — that one step of tonal separation is the whole depth system.
- **Palest Mint** (`--accent`) and **Mint Tint** (`--sidebar-accent`): the selection and hover wash. This is what a chosen ladder rung sits in.
- **Fog Shade** (`--muted`, `--secondary`): the inert fill — read-only fields, disabled controls, quiet chips.

### Tertiary
- **Persimmon** (`--destructive`): danger and validation failure. Declared once at the root and **inherited by every other palette**, brand and imported alike, never re-expressed — a preset that picks its own red against its own surfaces got it wrong once (Supabase's dark red measured ~1.5:1 on its near-black canvas and every issue badge vanished). Danger is a legibility contract, not a decorative choice.
- **Act-Here Amber** (`--warning`): the attention accent. It marks the placement tray, the critical-claim evidence nudge, the active answer hatch, and the open cells of the what's-left unit field. It is not alarm and it is not the ramp. Unlike the brick, it is **per-palette on one axis**: the hue is fixed at 70 in every palette, because "a decision is owed here" has to be the same colour everywhere, but each imported palette derives its lightness and chroma from its own `--primary` (`oklch(from var(--primary) …)`, clamped to a legible band) so the amber sits on that palette's surfaces. The four BRAND palettes all keep the root's authored pair — the brand's amber is measured against Pine, Fog and White, which are the only surfaces any of them uses, so there is nothing for them to re-derive.
- **Infographics series** (`--chart-1..5`): teal, indigo, sky, lilac, peach. Five, closed. The brand's chart palette with three colours deliberately removed — the gauge hue, amber, and brick — so a series can never be misread as a rung, a warning, or an error.

### Neutral
- **Hairline** (`--border`): the primary structural device in the entire system. Every separation you see is one of these unless it is a tonal step.
- **Neutral Ink** (`--muted-foreground`, 7.8:1): captions, labels, units, secondary counts. Carries more of the interface's actual words than the foreground colour does.

### The Gauge Ramp

The signature colour system: SEAL 0→4 rendered as **one hue stepping from pale and low-chroma to vivid**, with no neutral midpoint, because the scale is ordinal and each rung is strictly more sovereignty than the last. The hue is a single per-palette variable (`--seal-hue`) derived from that palette's own `--primary`, so the ramp is green under SUSE and Instrument, Pine's teal-green under Pine & Mint, blue under Fog Editorial and Modern Minimal, and violet under Claymorphism and Clean Slate — the *order* is identical in all of them because order lives in lightness and chroma, not in which hue was chosen.

It is **two ramps, not one**. Gauge Ink is for text and for SVG `currentColor` (the wheels, the staircase, the exposure map). Gauge Fill is for heat cells, badges and chips, and carries ordinary foreground text. The fill is not a tint of the ink: mixing the ink toward the surface compresses each step's lightness by roughly 78%, which on a single-hue ramp collapses adjacent steps to ΔL ≈ 0.02 — far under the ~0.06 an ordinal ramp needs to stay readable. The two are stepped independently against their own surfaces, and light-mode fill gaps measure 0.064 / 0.064 / 0.077 / 0.085.

**The Reserved Hue Rule.** Under the default palette the gauge hue is the brand's own green, and it belongs *entirely* to the ramp. No green button, no green success state, no green chart series, no green check. Whatever hue a palette assigns to `--seal-hue`, that hue is spent.

**The Unnamed Colour Rule.** UI copy may never name a colour. A legend reading "green = sovereign" is factually false under six of the eight shipping palettes — including two of the four BRAND palettes, whose ordinals are Pine's teal-green and Waterhole blue. Describe the ramp by intensity — "the palest rung", "the most saturated cell" — or by its number. This rule governs product copy only. This document is free to name colours because it is not on screen.

**The Inherited Danger Rule.** `--destructive`, `--destructive-foreground`, `--warning` and `--warning-foreground` are declared in the two root blocks and stripped from every imported palette. Alarm and attention are contracts with the reader. There is nothing for a palette to express in them.

## Typography

**Display / Body Font:** SUSE (with `ui-sans-serif`, `system-ui`, and the platform stack behind it)
**Label/Mono Font:** SUSE Mono (with `ui-monospace`, `SFMono-Regular`, `Menlo`)

Both faces are the SIL OFL brand typefaces, vendored as subsetted variable woff2 and inlined into the single-file build as base64 — no CDN, no remote `@import`, zero network requests at runtime.

**Character:** A humanist grotesque with a generous x-height and unfussy terminals, which is what makes a 12px label survive being the dominant type size in the system. The pairing is unassertive on purpose: at this density, a typeface with opinions becomes noise by the third row.

### Hierarchy
- **Display** (600, 1.875rem, 1.2): the one big number a tile exists to deliver — the score percentage, the floor's `SEAL-n`. Never more than one per tile, and it always has a caption directly under it.
- **Headline** (600, 1.5rem, 1.25, `-0.015em`): the question text itself, and only that. In an instrument, the thing being asked is the largest thing on the stage.
- **Title** (600, 1.125rem, 1.4): screen and dialog titles.
- **Reading** (400, 0.9375rem, 1.625, `--text-reading`): the two passages meant to be *read* rather than scanned — a question's `why` (set in a left-ruled aside) and each rung's description. The half-step above body and the loose leading are what mark them as prose.
- **Body** (400, 0.875rem, 1.5): the working size for content, values and controls.
- **Control** (500, 0.875rem): all button and interactive labels.
- **Label** (600, 0.75rem, `0.025em`, uppercase, muted): section headings, field captions, `SEAL-n · Level Name` eyebrows. The most-used styling in the system.
- **Caption** (400, 0.75rem, muted): counts, units, notes, help text — the sentence under almost every number.
- **Mono** (400, 0.75rem): ids, codes, keys, workbook `meta.id`. Identity, never prose.
- **Mark** (400, 0.6875rem, `--text-2xs`): dense mark labels — wheel legends, nav ticks, inspector rows. Below the Caption floor because these are annotations on a drawing, not sentences.
- **Micro** (400, 0.625rem, `--text-3xs`): the tightest marks — heat cells, tray chips, id chips. The floor. There is nothing below this, and the absence is the point.

**The Medium-Headline Rule.** Headings are set in medium (500), not bold — the brand guide's explicit instruction, applied as a base-layer default on `h1`–`h6` because Tailwind's preflight would otherwise reset them to 400. It is a default, not a lock: an explicit `font-*` utility still wins.

**The Earned Size Rule.** `text-xs` and `text-sm` carry 94% of the interface. Reaching past them is a semantic claim that something is a headline or a headline number — not a way to add emphasis. Emphasis is weight and colour. Size is rank. The rule has a floor as well as a ceiling: `--text-3xs` is the smallest step and there is no step below it, so a mark that will not fit at 0.625rem needs less content, not smaller type. Both ends are enforced — an arbitrary `text-[…]` fails the source scan (spec docs/specs/quality.md §2.5).

## Layout

**The shell is bounded to the viewport and the page never scrolls.** The root is `h-svh` with `overflow-hidden`. The header, both side panels and the main region are siblings inside it, and each scrolling region owns its own overflow. A tall rulebook or a long HUD scrolls in place rather than pushing the page — so the chrome stays exactly where the reader's hand left it. This is the single most consequential layout decision in the system, and everything else follows from it.

**Chrome.** A 3.5rem header bar (logo, subtitle, app actions, then the two theme controls) over the content row, with a footer beneath. Side panels are 18rem open and collapse to a 3rem icon rail, animating width over 200ms. **The collapse control lives inside the panel it collapses**, not in the header — open, it sits in the panel's 2.75rem title row. Collapsed, it becomes the rail's top icon. The chevron always points the way the panel will travel.

**The stage.** Inside the main region, a single-focus stage: a sticky header bar broken full-bleed out of the content column's 1.5rem padding (`-mx-6` sides, `-mt-6` top) so it pins flush under the app header, over a carousel content area. Stage changes slide the leaving and entering nodes across one grid cell in opposite directions — 240ms, `cubicOut`, collapsed to an instant swap under reduced motion.

**Rhythm.** The spacing scale in active use is tight and short: `0.5`, `1`, `1.5`, `2`, `3`, `4`, `6`. Row padding is `py-1` on chips and `p-4` on cards. `gap-2` and `space-y-2` are the default separations. `1.5rem` is reserved for separating whole sections. There is no wide-gutter tier because there is no wide-gutter content.

**The dashboard module — six columns, laid as wrapping flex rows.** A tile does not claim a grid cell. It declares what its content can spend, and the browser computes the row. Three declarations, all content truths (`ui/dashboard/tile-width.ts`, `analytics/tiles.ts`):

- **`width`** — its share of the row, named as the fraction it takes: `sixth`, `third`, `half`, `twoThirds`, `full`. Five-sixths is absent because it strands a column nothing fits in.
- **`grow`** — whether the body can *use* surplus width. A list, a ledger, a heat matrix can. A headline number cannot, and a figure is forbidden from claiming it (`FigureTile` makes `grow` `never`, so the contradiction fails typecheck rather than a review).
- **`min`** — the width in rem below which the body stops being legible. Measured, not preferred.
- **`hug`** — whether the body's height is its own content rather than the row's. Only for a body bounded by what it has to say. Anything that grows with the estate must fill, or it crops.

**Six, and not five, because five cannot express equality.** The most common structural relationship on this surface is *equivalence* — the four heat tiles are one component on four axes. `floor` and `score` are the two numbers the product refuses to collapse. Under five columns two tiles can only sit 2+3, a 1.5:1 ratio that asserts one matters more. Six also gives every useful width a name a reader already owns, which fifths do not. The declared share is exact: with tiles summing to six, their bases and gaps add to 100% at any container width.

**The Symmetric-Remainder Rule.** A row that does not divide evenly is settled twice. Tiles that declared `grow` absorb the remainder first. Anything left becomes equal air on both sides (`justify-content: center`), never dead space dumped on the right. This is why a lone figure — `exposure`, `estate-wheel`, `objectives` — reads as deliberate rather than broken: it takes symmetric air *outside* its card instead of floating in its own. A figure is never widened to close the gap, because extra width only scales the drawing and the same hole reappears inside a bigger box.

**Height is the row's, until a bounded body says otherwise.** A row's height is its tallest tile and the rest fill it — that is what keeps a row hole-free, and a row span stays refused because it reserves height the neighbours cannot reach. Filling is wrong in one case: beside a *capped* figure. `objectives` caps its ring and still sets a ~514px row, while `whats-left` measures 98–179px at the two columns beside it, so filling spent the difference on air inside a card. `hug` ends that card at its content and leaves the air in the column, where it reads as space rather than as an empty panel. It is expressed as a keyword on the cell (`--tile-cross`, `align-self`), never a height: nothing is frozen at one container width, so what a hugging tile measures stays a function of the width it actually got.

**A set wraps as a set.** The four heat tiles share one floor rather than each deriving its own from its pivot count. With `heat-dimension`'s eleven columns set higher than the rest, a narrowing row broke the four into 1 / 2 / 1 — four equals reflowing as three unequal lines.

**Elsewhere.** Radial views and centred flows are constrained to `max-w-3xl`. Identity and setup gates are constrained to `max-w-lg`.

**Responsive posture — stated honestly.** This is a desktop instrument, and no surface should claim otherwise. But the dashboard consults **no breakpoint at all**: wrapping falls out of `flex-basis: max(min, share)` against the container, so one mechanism covers window resize, panel collapse, and zoom. That is not purity — it is the only thing that works here. Both side panels collapse 18rem → 3rem and change a tile's available width by roughly a third **without the viewport changing**, which a media query is structurally blind to. Tile bodies read the same width through `@container` on the tile frame. Verified from 500px to 2000px of row width with no horizontal overflow.

## Elevation & Depth

**There is no elevation system, and that is the design.** Depth is expressed by exactly two devices: a hairline border, and one step of tonal lift (a White card on a Fog page in light, and a lifted Pine card on the Pine canvas in dark. Every step along the same hue at low chroma ensures the depth ramp stays one colour).

**The Ground-Level Rule.** Nothing in the document flow casts a shadow. Shadows belong exclusively to things that have *left* the page — the six `z-50` overlays, exhaustively: tooltip, dialog, alert dialog, popover, chart tooltip, and the drag ghost. This is verifiable in one pass, and it is the audit test: grep the source for a shadow utility, and every hit must sit on a fixed or absolutely-positioned overlay. A shadow used to make an in-flow card "pop" is a defect, because in a system with this much data on screen, ambient depth is just blur.

The shadow *tokens* are nonetheless a full seven-step ramp restated from Tailwind's defaults, so that a palette can re-express them. Claymorphism does exactly this — wide diffuse clay shadows are that palette's entire point — and it lands on those same six overlays. **The rule constrains where a designer reaches for depth. The palette stays free to say what depth looks like once it is warranted.**

### Shadow Vocabulary
- **`--shadow-md`** — the overlay default: tooltip, dialog, alert dialog, popover.
- **`--shadow-xl`** — chart tooltips, which float over an already-busy surface.
- **`--shadow-lg`** — the drag ghost, the only shadow attached to a pointer.

## Shapes

Two radius families, and the distinction is load-bearing.

**Structural radii scale with the palette.** `sm` / `md` / `lg` / `xl` all derive from `--radius` (`calc(--radius - 4px)` through `calc(--radius + 4px)`), so they run 4/6/8/12px under SUSE, tighten to 2/4/6/10px under Modern Minimal, and swell to 16/18/20/24px under Claymorphism. Cards, tiles, panels, buttons and inputs all use these — they are what makes a palette switch feel like a different product rather than a recolour.

**Small parts hold a fixed radius.** The bare `rounded` utility (0.25rem, outside the token scale) is used on the interface's smallest parts — keyboard hints, inline code chips, read-only value boxes, grain toggles, swatch cells. It does not follow `--radius` and so stays constant across palettes. This is consistent in practice, but note the consequence: under Claymorphism a 20px card contains 4px chips. If that reads as a mismatch, the fix is to move these to `rounded-sm`, not to change `--radius`.

**Pills are for things that move.** `rounded-full` marks the draggable and the transient — answer chips, the drag ghost, the landing preview. If it is round, it can be picked up or it is telling you where something will land.

**The Reserved Border Rule.** Every element that will *ever* show a border carries `border border-transparent` at rest. State changes then recolour a border that is already there instead of adding one — so nothing reflows, shifts, or jumps by a pixel when a drag begins, a field errors, or a row is selected. In a dense grid, a one-pixel reflow propagates visibly across the whole screen.

**The Dashed-Is-Provisional Rule.** Border style carries meaning, not decoration. Dashed means *hypothetical*: while a drag is live, every legal drop target outlines dashed, and a dashed pill previews what will land where. Solid means *committed*: the target under the pointer goes solid and fills.

There is one deliberate exception, and it is a **selection** mark rather than a border: the picked cell of `ui/seal-selector` carries a dashed `outline` **outside** its box (`outline-offset-2`). A seal cell is a filled swatch of the ramp, so it has no border and no wash left to spend on selection — the mark has to sit off the fill, and a dashed ring off the fill is the one mark that cannot be misread as part of the swatch. Read this as the rule's boundary, not its repeal: dashed still never appears on a *border*, and a re-answer at a rung is in any case a proposal until its landing is recorded.

**Rules and rails.** Separators are 1px hairlines. The ladder's staircase rail is a 1px line threaded through the badge column, drawn at row level rather than inside each button so it spans the full row, with each segment overrunning 2px past its edge so no transparent border or selection fill can split it. A left-ruled `border-l-2` aside marks quoted context — the question's `why`.

## Components

### Buttons
- **Shape:** structural large radius (0.5rem under SUSE), 2rem tall at default size, `px-2.5`, control typography (0.875rem / 500). Four heights ship: 1.5rem (`xs`), 1.75rem (`sm`), 2rem, 2.25rem (`lg`), plus square icon variants at each.
- **Primary:** Jungle fill with Pine text. Note the deliberate asymmetry — the hover fill change is scoped to `[a]:hover`, so only link-buttons restyle on hover. A real `<button>` answers with the press instead.
- **Outline / Secondary / Ghost:** transparent or one-step fills that resolve to the muted wash on hover. `aria-expanded` gets the same treatment as hover, so a button holding a popover open looks held open.
- **Destructive is a tint, never a fill.** 10% destructive background with destructive text, deepening to 20% on hover. A solid red button would be the loudest thing on any screen in the product, and nothing here deserves that.
- **Press:** `active:translate-y-px` — a one-pixel drop, suppressed on menu triggers.
- **Focus:** a 3px `--ring` at 50% with the border switching to `--ring`. Selection rings elsewhere are 1px inset. Only focus is thick.
- **Element follows semantics:** an `href` renders an `<a>`, so a link styled as a button stays middle-clickable and correct for assistive tech.

### Inputs / Fields
- **Style:** full-width, medium radius, 1px border, page-background fill, `0.5rem 0.75rem`. A `compact` density (`px-2 py-1`) exists to sit inline beside read-only detail fields.
- **Focus:** a 1px `--ring`, native outline suppressed.
- **Invalid:** border and focus ring both swap to destructive.
- **Disabled and read-only are owned globally.** `theme.css` styles them with *unlayered* rules, which outrank Tailwind's utilities layer without `!important`. Disabled gets muted fill, muted text, 60% opacity and `not-allowed`. Read-only gets the same inert fill but stays fully legible and selectable because a read-only value exists to be copied. **Never add `disabled:` or read-only utilities to a control** — they will be overridden, and the local version will drift.

### Cards / Tiles
- **Corner:** structural large radius. **Border:** 1px hairline. **Background:** card. **Padding:** 1rem. **Shadow:** none, ever (see Elevation).
- A card leads with an uppercase muted label, not a title-cased heading — the heading style is reserved for the stage.
- **Analytics tiles** wear a fixed chrome: title, *the question the tile answers* rendered as caption text directly beneath it, and a maximise control where the tile declares one (`maximises`, default true — a body whose grid rendering is its whole reading gets no button rather than one that only enlarges it). The question is not decorative — it is what earns the tile its place on the dashboard. A tile that cannot state its question does not ship.

### The Unit Field
One cell per unit in scope, the open ones carrying `--warning` — the counterpart to `ratio-bar` rather than a replacement for it.
- **A field states a population where a bar states a proportion.** `3 of 67 open` is a 4.5% bar, and a 4.5% bar reads as "almost nothing has happened" when the truth is "almost everything has". Sixty-seven cells with three specks in them is read correctly as a nearly-complete population before a word of it is read at all.
- **Open cells are `--warning`.** An open unit is a decision owed by a named owner, which is what Act-Here Amber means everywhere else it appears. Never the SEAL ramp: a backlog is not a level, and the green hue would say the estate scored something here.
- **Answered cells are `bg-border`, not `bg-muted`.** `--muted` on a light card is a 1.05:1 step, so the population would vanish and the field would read as three floating specks on nothing. The border token is the lightest step that survives both modes.
- **Above `CAP` = 240 units the field falls back to the bar** (`fieldDrawable`). A dozen rows of 11px specks is not a readable population, and a large population is a proportion again. The numeral is the source of truth in both cases. The field never rounds and never bundles.

### Navigation
- Navigation is the stage header plus the two collapsible panels. There is no nav bar. The header carries the logo, an optional subtitle, app actions, and the two theme controls — palette then mode, in that order, because that is the order of the two token axes.
- The logo is an inline SVG whose fills read `--primary` and `--primary-foreground` directly, so the mark recolours with the theme like everything else. It is a placeholder for a real mark. The contract (a themeable inline SVG, never a remote asset) is what must survive the swap.

### The Ladder (signature)
The answering surface, and the clearest expression of the north star. Rungs stack SEAL-0 at the top descending to SEAL-4 at the bottom — *you start exposed and climb down the rungs into sovereignty* — as a proper `radiogroup` with roving tabindex, arrow-key traversal, and digit keys that jump straight to a rung (a sparse ladder simply no-ops on a missing digit. It never snaps to the nearest).

Each rung is a 2rem gauge badge carrying its number in ramp ink over ramp fill, an uppercase `SEAL-n · Level Name` eyebrow, and the rung description in reading type. The selected rung sits in the accent wash with a 1px inset ring. An unselected rung shows its digit as a `kbd` hint at zero opacity that fades in on hover or keyboard focus — **the interface teaches its own shortcuts, but only to someone already reaching for them.**

**The Quiet-Until-Asked Rule.** Controls recede into the surface at rest — transparent borders, ghost buttons, invisible drop zones, hidden key hints — and state is the only thing permitted to draw the eye. On a screen carrying this much data, every element that asserts itself at rest is one the reader has to actively dismiss.

### The Wheels (signature)
Radial structural views (instrument, question, merge) built as hand-drawn SVG on a shared viewbox. Spokes read length as quantity. Strata are diamonds placed along the spoke. The hub carries a headline number in 15px/600 over a 10px muted caption. Every stroke takes its colour from a token via `currentColor` and a `text-*` utility, because `fill`/`stroke` cannot take a Tailwind background utility. Empty structure — a dimension no question touches — renders as a destructive-coloured stub at the hub rather than as nothing, because absence is a finding.

## Do's and Don'ts

### Do:
- **Do** express every colour as a semantic token utility. `ui/theme/tokens.test.ts` scans the whole platform source and fails the build on a hex, a raw `rgb()`/`hsl()`/`oklch()`, or any Tailwind palette utility (`text-amber-700`, `bg-zinc-800/50`). A `color-mix()` composed over `var(--token)` is explicitly allowed.
- **Do** verify every surface in light *and* dark under at least two palettes. SUSE plus Claymorphism is the highest-yield pair — it varies hue, radius (0.5rem → 1.25rem) and shadow simultaneously. Fog Editorial is the second check worth making, because it is the only palette whose shadow ramp is fully transparent: anything that relied on elevation rather than on a border disappears under it.
- **Do** reach for `text-xs` and `text-sm` first, and treat anything larger as a semantic claim.
- **Do** give any element that will ever show a border `border border-transparent` at rest, so state recolours instead of reflowing.
- **Do** route every ramp reference through `sealInkClass()` / `sealSwatchClass()`. A computed `text-seal-${n}` compiles to no utility at all — Tailwind v4 extracts class names by scanning source text — and renders silently unstyled.
- **Do** keep a panel's collapse control inside the panel.
- **Do** present a floor and its unknown count as one value, and render absence as an em-dash plus a sentence. Never as a zero.
- **Do** let each region own its scroll. The page itself must never scroll.

### Don't:
- **Don't** name a colour in UI copy. It is false under six of the eight palettes.
- **Don't** spend the gauge hue on anything but the ramp — no success green, no green series, no green check under the default palette.
- **Don't** put a shadow on anything in the document flow. Depth is a border and one tonal step.
- **Don't** add `disabled:` or read-only utilities to a form control. `theme.css` owns those unlayered and will win.
- **Don't** introduce a sixth chart colour, or reuse the amber or the brick as a series — they are the attention and alarm contracts.
- **Don't** re-declare `--destructive` or `--warning` in a palette block. They are inherited by design.
- **Don't** use dashed borders decoratively. Dashed means provisional and nothing else.
- **Don't** collapse the floor and the score into a single number or a single visual. They answer different questions, and the product is structurally forbidden from implying one headline.
