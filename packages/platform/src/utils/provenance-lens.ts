// Lens tinting for gesture provenance (spec §4.4 item 4 / §9 S8) — one
// convention for every view: SOLID outline = individually placed (considered),
// DASHED = mixed gestures, DASHED + FADED = wholly swept by one group gesture.
// Pure presentation, mapped theme utilities only (spec §3). Description made
// visible, never judgment (invariant #4) — the engine scored these identically.
/** How a gesture placed an answer (spec §4.6). One vocabulary for every medium. */
export type Provenance = 'group' | 'individual' | 'mixed';

export function provenanceLensClass(provenance: Provenance): string {
  if (provenance === 'group') return 'border-2 border-dashed border-foreground/50 opacity-70';
  if (provenance === 'mixed') return 'border-2 border-dashed border-foreground/50';
  return 'border-2 border-solid border-foreground/50';
}

/** SVG twin of `provenanceLensClass`, for marks that are strokes rather than
 *  boxes (the wheels). Same convention, same three readings. */
// The same convention in two media — box borders there, SVG strokes here — kept
// side by side so the two can never drift, mirroring sealSwatchClass/sealInkClass.
export function provenanceStrokeClass(provenance: Provenance): string {
  if (provenance === 'group') return '[stroke-dasharray:5_3] opacity-60';
  if (provenance === 'mixed') return '[stroke-dasharray:5_3]';
  return '';
}
