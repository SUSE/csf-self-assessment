<script lang="ts">
  import type { PlacedLabel } from '../wheel';
  import { sealInkClass } from '../../utils/seal-color';
  import { labelInkClass, labelMeta, labelName, labelSeal } from './draw';
  import type { ChipSeal, InstrumentChip } from './model';

  // A spoke's name, just outside the rim, with its counts riding the same line:
  // the question-unit count, then `· ◇N` strata where the dimension splits, then
  // — only when a facilitator's answers are loaded — the lowest selected SEAL as
  // a colour-coded `◈N`. Internal to instrument-wheel.
  
  // The tspans are written without whitespace between them on purpose: SVG text
  // preserves inter-element whitespace, so a newline here would print as a space
  // and push the suffixes off their measured budget.
  type Props = {
    chip: InstrumentChip;
    label: PlacedLabel;
    /** The chip's seal reading, or null when the wheel is purely structural.*/
    seal: ChipSeal | null;
  };
  let { chip, label, seal }: Props = $props();

  const suffix = $derived(labelSeal(seal));
  const answered = $derived(seal !== null && seal.seal !== null);
</script>

<text
  x={label.x}
  y={label.y}
  text-anchor={label.anchor}
  font-size="13"
  font-weight={chip.emphasis ? 500 : 400}
  fill="currentColor"
  class={labelInkClass(chip)}
>{labelName(chip, seal)}<tspan
    dx="6"
    font-size="11"
    font-weight="400"
    fill="currentColor"
    class="text-muted-foreground">{labelMeta(chip)}</tspan>{#if suffix}<tspan
      dx="5"
      font-size="11"
      font-weight={answered ? 600 : 400}
      fill="currentColor"
      class={answered && seal?.seal !== null && seal?.seal !== undefined
        ? sealInkClass(seal.seal)
        : 'text-muted-foreground'}>{suffix}</tspan>{/if}</text>
