// The layer every radial figure sits on: one coordinate space, one label
// de-collision rule, one chip taxonomy, one exposure reading. A wheel module owns
// only what makes it that wheel.
//
// Pure TypeScript only — the shared marks (MagnitudeRings, ArcDivider, WheelHub,
// HitLane) are imported by path, because the wheel MODELS import this barrel and
// they are compiled without the Svelte plugin.
export { activateOnKey } from './activate';
export { chipAngles, type ChipKind } from './chips';
export { exposureReader, informative, type ExposureMarker, type ExposureReader } from './exposure';
export {
  inlineNameBudget,
  labelAnchor,
  labelNudge,
  labelRadius,
  markerRadius,
  placeLabels,
  polar,
  ringRadius,
  spokeAngles,
  truncate,
  CX,
  CY,
  HUB,
  LABEL_CHAR_PX,
  LABEL_MAX_CHARS,
  MARKER_GAP,
  MARKER_STEP,
  RIM,
  RINGS_EXPOSED,
  RINGS_PLAIN,
  SUB_CHAR_PX,
  WHEEL_VIEWBOX,
  type LabelNudge,
  type PlacedLabel,
  type PlaceLabelsOptions,
  type SealRings,
} from './geometry';
