<script lang="ts" generics="P extends DragPayload">
  import CircleSlash from '@lucide/svelte/icons/circle-slash';
  import Diamond from '@lucide/svelte/icons/diamond';
  import { getDnd, draggable, type DragPayload } from '../dnd';

  // A fan-out chip (spec §4.8 / the chip-anatomy prototype). ONE anatomy, two shapes:
  //  • plain      → a single draggable unit: [⚑ Name] with an optional trailing
  //                 [count ⌄] SPLIT control (replacing the old ⋯ — a chevron carries
  //                 direction + reversibility, the count answers "how many strata").
  //  • grouped    → a split dimension as ONE pill: [⚑ Name k/all ⤺][service][software]…
  //                 the parent named ONCE as a lead (its ⤺ re-joins), each stratum a
  //                 SEGMENT that is independently draggable + tappable. On a rung this is
  //                 the FRAGMENT pill — the strata of one dimension that landed there,
  //                 with a k/all fraction; in the tray the fraction is omitted.
  // Every draggable part carries data-tray-chip + data-chip-key so the keyboard/digit
  // path targets the focused segment. The critical ⚑ TRAVELS (the drag payload keeps the
  // full "Dimension · stratum" label even though the segment shows the bare stratum).
  // Selection + set-aside are NEUTRAL (invariant #3 — never green). STATELESS — the card
  // owns split/lift identity.
  type Segment<P extends DragPayload> = {
    key: string;
    label: string;
    dragPayload: P;
    state?: 'answered' | 'dont-know' | 'na' | null;
    selected: boolean;
    onSelect: () => void;
  };
  type Props = {
    critical: boolean;
    segments: Segment<P>[];
    // grouped (a split dimension): render a parent lead + one segment per stratum.
    grouped?: boolean;
    name?: string; // the dimension name for the grouped lead
    fraction?: string | null; // "k/all" on a rung fragment; null in the tray / when whole
    onMerge?: () => void; // grouped: re-join the dimension (⤺)
    // plain splittable: the trailing [count ⌄] split control.
    splittable?: boolean;
    count?: number;
    onSplit?: () => void;
  };
  let {
    critical,
    segments,
    grouped = false,
    name,
    fraction = null,
    onMerge,
    splittable = false,
    count,
    onSplit,
  }: Props = $props();

  const dnd = getDnd<P>();
  const anySelected = $derived(segments.some((s) => s.selected));
  const lead = $derived(segments[0]);
  const plainSetAside = $derived(!grouped && lead ? lead.state === 'na' || lead.state === 'dont-know' : false);
</script>

<span
  class="inline-flex items-stretch overflow-hidden rounded-full border text-xs transition-colors {anySelected
    ? 'border-foreground'
    : 'border-border hover:border-foreground/40'} {plainSetAside ? 'bg-muted' : 'bg-card'}"
>
  {#if grouped}
    <button
      type="button"
      class="inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1 font-medium hover:bg-accent"
      title={name ? `Answer ${name} as one dimension again` : 'Re-join'}
      onclick={onMerge}
    >{#if critical}<span class="text-warning-ink" aria-label="critical">⚑</span>{/if}<span>{name}</span>{#if fraction}<span class="font-mono text-3xs font-bold text-muted-foreground">{fraction}</span>{/if}<span class="ml-0.5 border-l border-border pl-1.5 text-muted-foreground" aria-hidden="true">⤺</span></button>
    {#each segments as s (s.key)}
      <button
        type="button"
        use:draggable={{ session: dnd, key: s.key, payload: s.dragPayload }}
        data-tray-chip
        data-chip-key={s.key}
        aria-pressed={s.selected}
        class="inline-flex items-center gap-1.5 whitespace-nowrap border-l border-border px-3 py-1 transition-colors {dnd
          ? 'cursor-grab active:cursor-grabbing'
          : ''} {s.selected ? 'bg-accent font-semibold' : 'text-foreground/85 hover:bg-accent'}"
        onclick={s.onSelect}
      >{#if s.state === 'na'}<CircleSlash class="size-3 shrink-0" aria-label="doesn't apply" />{:else if s.state === 'dont-know'}<Diamond class="size-3 shrink-0" aria-label="nobody knows" />{/if}<span class={s.state === 'na' ? 'line-through' : ''}>{s.label}</span></button>
    {/each}
  {:else if lead}
    <button
      type="button"
      use:draggable={{ session: dnd, key: lead.key, payload: lead.dragPayload }}
      data-tray-chip
      data-chip-key={lead.key}
      aria-pressed={lead.selected}
      class="inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1 font-medium {dnd
        ? 'cursor-grab active:cursor-grabbing'
        : ''} {lead.selected ? 'bg-accent' : plainSetAside ? 'text-muted-foreground' : 'hover:bg-accent'} {splittable
        ? ''
        : 'rounded-r-full'}"
      onclick={lead.onSelect}
    >{#if lead.state === 'na'}<CircleSlash class="size-3 shrink-0" aria-label="doesn't apply" />{:else if lead.state === 'dont-know'}<Diamond class="size-3 shrink-0" aria-label="nobody knows" />{/if}{#if critical}<span class="text-warning-ink" aria-label="critical">⚑</span>{/if}<span class={lead.state === 'na' ? 'line-through' : ''}>{lead.label}</span></button>
    {#if splittable}
      <button
        type="button"
        class="inline-flex items-center gap-1 self-stretch border-l border-border px-2 text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label={count ? `Split into ${count} strata` : 'Split'}
        title={count ? `Answer ${count} strata separately` : 'Split'}
        onclick={onSplit}
      ><span class="font-mono text-3xs font-bold">{count}</span><span aria-hidden="true">⌄</span></button>
    {/if}
  {/if}
</span>
