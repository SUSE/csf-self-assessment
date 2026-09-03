<script lang="ts">
  import { Arc } from 'layerchart';
  import type { SVGAttributes } from 'svelte/elements';
  import { activateOnKey } from '../../../wheel';
  import { contributorPress } from './contributor-press.svelte';
  import type { ContributorRow } from './contributor-rows';

  type ContributorArcInteraction = Pick<
    SVGAttributes<SVGPathElement>,
    'role' | 'tabindex' | 'aria-hidden' | 'onclick' | 'onkeydown'
  >;

  // One slice of the dial, and the second hit area on its legend line's press: the
  // name beside the ring is the accessible control (it can be tabbed to and read),
  // so the slice is `aria-hidden` and not a tab stop — two hit targets, one control,
  // rather than ten tab stops in one tile. The keyboard handler is still wired,
  // because the arc can be reached programmatically.
  //
  // The pressed state shows on the legend line, which has a box to fill; a slice of
  // a ring has neither a rest state to leave nor room for a ring of its own.
  let {
    row,
    arc,
    ink,
    thickness,
  }: {
    row: ContributorRow;
    /** One `arcs` entry from layerchart's Pie: the angles this slice occupies. */
    arc: { startAngle: number; endAngle: number; padAngle: number };
    ink: string;
    /** Offset from the outer radius — the ring's weight, owned by the dial. */
    thickness: number;
  } = $props();

  const press = contributorPress(() => row);

  // Spread rather than conditional attributes, as `wheel-spoke` does: the slice is a
  // hit area only where a session exists, and a spread keeps that one code path.
  const interactive = $derived<ContributorArcInteraction>(
    press.pressable
      ? {
          role: 'button',
          tabindex: -1,
          'aria-hidden': true,
          onclick: press.press,
          onkeydown: (event: KeyboardEvent) => activateOnKey(event, press.press),
        }
      : {},
  );
</script>

<Arc
  data-contributor-arc={row.key}
  startAngle={arc.startAngle}
  endAngle={arc.endAngle}
  padAngle={arc.padAngle}
  innerRadius={thickness}
  cornerRadius={1}
  {...interactive}
  class={`fill-current outline-none ${ink} ${press.pressable ? 'cursor-pointer' : ''}`} />
