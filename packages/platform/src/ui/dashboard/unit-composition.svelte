<script lang="ts" module>
  // The unit base as one band: what carries a gesture, what the room admitted it
  // does not know, what is still owed.
  
  // The answered part is painted in the FLOOR's seal, the same move the score arc
  // makes: the estate's gate rides the mark that says how much of it was read, so
  // neither is seen without the other. With no floor there is no seal to paint and
  // it falls back to the structural ink. The other two never take the ramp — an
  // admitted unknown is not a rung, and an open unit is the act-here amber.
  const TONE = {
    dontKnow: 'bg-axis-ink-soft',
    open: 'bg-warning',
  } as const;

  const UNSEALED = 'bg-axis-ink';

  type Tone = keyof typeof TONE | 'placed';
  type Slice = { key: Tone; count: number; label: string; attrs: Record<string, string> };
</script>

<script lang="ts">
  import type { Seal } from '../../schema';
  import { sealInkClass } from '../../utils/seal-color';

  let {
    total,
    placed,
    dontKnow,
    floor,
    class: className = '',
  }: {
    total: number;
    /** Units carrying an answer of any state — don't-knows included.*/
    placed: number;
    dontKnow: number;
    /** The floor the answered part is painted in. `null` leaves it hue-free.*/
    floor: Seal | null;
    class?: string;
  } = $props();

  const open = $derived(Math.max(0, total - placed));
  // `bg-current` over the ink ramp, not the fill ramp: the fill is a tinted
  // surface for text to sit on, and nothing sits on a band.
  const paint = $derived((key: Tone) =>
    key === 'placed'
      ? floor === null
        ? UNSEALED
        : `bg-current ${sealInkClass(floor)}`
      : TONE[key],
  );
  // `placed` owns the don't-knows, so the leading slice is what is left of it once
  // they are drawn apart. The three always sum to the whole base.
  const slices = $derived<Slice[]>(
    [
      { key: 'placed', count: Math.max(0, placed - dontKnow), label: 'placed', attrs: {} },
      {
        key: 'dontKnow',
        count: dontKnow,
        label: "don't-know",
        attrs: { 'data-ribbon-dontknow': '' },
      },
      { key: 'open', count: open, label: 'open', attrs: { 'data-ribbon-open': '' } },
    ].filter((slice) => slice.count > 0) as Slice[],
  );
  // The leading slice takes no legend entry — the ribbon's own count names it. The
  // legend sits at the band's end because both slices it names are its tail.
  const legend = $derived(slices.filter((slice) => slice.key !== 'placed'));
  const share = (count: number) => (total > 0 ? (count / total) * 100 : 0);
</script>

<div class={`flex flex-col gap-1.5 ${className}`}>
  <!-- Decorative: the legend and the ribbon's reading carry every count. -->
  <span aria-hidden="true" class="flex h-3 overflow-hidden rounded bg-muted" data-ribbon-band>
    {#each slices as slice (slice.key)}
      <span
        data-ribbon-slice={slice.key}
        data-seal={slice.key === 'placed' ? (floor ?? undefined) : undefined}
        class={`block h-3 min-w-0.5 ${paint(slice.key)}`}
        style={`width: ${share(slice.count)}%`}></span>
    {/each}
  </span>
  {#if legend.length > 0}
    <ul class="flex flex-wrap items-center justify-end gap-x-4 gap-y-1">
      {#each legend as slice (slice.key)}
        <li class="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span aria-hidden="true" class={`block size-2 rounded-[2px] ${paint(slice.key)}`}></span>
          <span {...slice.attrs} class="tabular-nums">{slice.count} {slice.label}</span>
        </li>
      {/each}
    </ul>
  {/if}
</div>
