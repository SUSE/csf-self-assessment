export { default as Dashboard } from './dashboard.svelte';
export { default as CompletenessRibbon } from './completeness-ribbon.svelte';
// The figures the Report draws, public so every mark has one rendering: the
// document takes the figures and not the frames (report.md §3.3,).
export { FloorReading } from './tiles/floor-tile';
export { ScoreReading } from './tiles/score-tile';
export { ObjectivesRing } from './tiles/objectives-tile';
export { default as HeatGrid } from './tiles/heat-grid.svelte';
export { StaircaseFigure } from './tiles/staircase-tile';
export { ExposureMap } from './tiles/exposure-tile';
export { EstateWheelFigure } from './tiles/estate-wheel-tile';
export { CredibilityBody } from './tiles/credibility-tile';
export { CheckBand } from './tiles/second-look-tile';
export { default as UnitField, fieldDrawable } from './unit-field.svelte';
export { default as TileFrame } from './tile-frame.svelte';
export { TILES, type TileEntry } from './registry';
export type { TileProps } from './tile-props';
