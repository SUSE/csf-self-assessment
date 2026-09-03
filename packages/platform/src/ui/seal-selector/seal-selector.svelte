<script lang="ts">
  import { RadioGroup as RadioGroupPrimitive } from 'bits-ui';
  import { cn } from '../../utils/cn';
  import { sealSwatchClass } from '../../utils/seal-color';
  import type { SealChoice } from './choices';

  // A gauge face you can press: the ladder's rungs as one row of cells, each in
  // its own step of the SEAL fill ramp, exactly one of them selectable.
  //
  // It renders ITEMS, not a group — it must sit inside a `RadioGroup.Root`, the
  // same way a `RadioGroupItem` does. That is the point: the cells then share one
  // value with whatever other options the host lists (Merge's two "Take …" rows),
  // so picking a rung deselects them and one arrow-key sweep covers all of them.
  // For a standalone selector, wrap it in a `RadioGroup.Root` of its own.
  //
  // The mark alone is not a name a screen reader can use, so each cell carries
  // the choice's full sentence as its label and shows only the mark.
  // `onPick` fires on every press, including a press on the cell that is already
  // the group's value — which the group's own `onValueChange` cannot report,
  // because nothing changed. A host that treats a pre-selection as undecided
  // needs that press (see resolution-choices).
  type Props = {
    choices: SealChoice[];
    onPick?: (value: string) => void;
    class?: string;
  };
  let { choices, onPick, class: className }: Props = $props();
</script>

<!-- gap-2, not gap-1: the selected cell's dashed ring is drawn OUTSIDE its box, so
     the row has to leave it room or it collides with the next cell. -->
<div class={cn('flex flex-wrap gap-2', className)} data-seal-selector>
  {#each choices as choice (choice.value)}
    <RadioGroupPrimitive.Item
      value={choice.value}
      aria-label={choice.label}
      data-seal={choice.seal}
      onclick={() => onPick?.(choice.value)}
      class={cn(
        // The cell keeps a transparent border at rest so a hover or state change
        // RECOLOURS a border instead of adding one — nothing shifts by a pixel.
        'inline-flex h-8 min-w-9 cursor-pointer items-center justify-center rounded border border-transparent',
        'px-2 text-sm tabular-nums transition-[color,border-color,outline-color]',
        sealSwatchClass(choice.seal),
        'hover:border-ring/60',
        // Selection is a DASHED ring drawn OUTSIDE the cell — an `outline` with an
        // offset, not a border or an inset ring, so the fill keeps its full area
        // and the ring cannot be mistaken for part of the swatch. Every cell keeps
        // its TRUE ramp step: dulling the unselected ones made an unpicked SEAL-4
        // read paler than a picked SEAL-3, inverting the one thing the ordinal
        // ramp must always say. The state hook is `data-[state=checked]`, bits-ui
        // 2.18's own attribute — a `data-checked:` utility never matches here.
        // `outline-none` at rest kills the browser's own focus outline; the
        // `data-[state=checked]` variant carries an attribute in its selector, so
        // it outranks that and switches the dashed ring back on when picked.
        // Focus stays the box-shadow ring, which is a different property and so
        // shows on top of the dashes rather than replacing them.
        'outline-none data-[state=checked]:outline-2 data-[state=checked]:outline-dashed data-[state=checked]:outline-ring data-[state=checked]:outline-offset-2',
        'data-[state=checked]:font-semibold',
        'focus-visible:ring-3 focus-visible:ring-ring/50',
      )}
    >
      {choice.mark}
    </RadioGroupPrimitive.Item>
  {/each}
</div>
