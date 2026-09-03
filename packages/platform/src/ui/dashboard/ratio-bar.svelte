<script lang="ts">
  import type { ShareFill } from '../../utils/seal-color';
  import { shareInkClass } from '../../utils/seal-color';

  // A ratio drawn as a track and a fill. What the fill means is the caller's claim
  // — the same three-way choice `unit-composition` makes on its band: a seal, the
  // act-here amber for a tail owed (a backlog is not a level), or structural ink.
  //
  // `align="end"` parks the fill at the far end of the track, for a share that
  // is the tail left of a whole rather than progress made: a 3%-filled bar
  // growing from the left beside "3 of 90 units" reads as "almost nothing done"
  // when the truth is the opposite.
  //
  // Any extra attributes land on the fill, which is the part a test looks for.
  let {
    fraction,
    align = 'start',
    fill = 'ink',
    class: className = '',
    ...rest
  }: {
    fraction: number;
    align?: 'start' | 'end';
    /** The seal this share stands at, `open` for a tail owed, `ink` for neither. */
    fill?: ShareFill;
    class?: string;
    [attr: string]: unknown;
  } = $props();

  const clamped = $derived(Math.max(0, Math.min(1, fraction)));
  // `bg-current` over the ink ramp, as the ribbon's band does: the fill ramp is a
  // tinted surface for text to sit on, and nothing sits on a bar.
  const paint = $derived(`bg-current ${shareInkClass(fill)}`);
</script>

<span class={`flex h-1 rounded bg-muted ${align === 'end' ? 'justify-end' : ''} ${className}`}>
  {#if clamped > 0}
    <span
      {...rest}
      data-seal={typeof fill === 'number' ? fill : undefined}
      class={`block h-1 min-w-0.5 rounded ${paint}`}
      style={`width: ${clamped * 100}%`}></span>
  {/if}
</span>
