<script lang="ts">
  import { cn } from '../../utils/cn';
  import type { Reading, ReadingTone } from './readings';
  // Deep imports: the Inspector's subject union names this ledger's reading ids,
  // so going through its barrel would be a cycle.
  import { getInspector } from '../inspector/inspector.svelte';
  import type { InspectSelection } from '../inspector/subject';

  // One row of the instrument's readings ledger: the count, what it counts, and
  // the qualifier it is measured against. Internal to instrument-wheel.
  
  // These were eight equal tinted cards in an eight-across strip. Equal boxes give
  // equal weight, so a balanced count and a coverage gap looked alike, and at
  // ~1280 each card was ~130px and clipped its own qualifier mid-line. As rows,
  // the counts align into a scannable column and only an exceptional reading takes
  // a surface — so the one dial that needs turning is the only thing wearing
  // colour.
  
  // The row is INSPECTOR-AWARE, the same way a wheel spoke is: pressing it reports
  // the reading to the rail rather than jumping the stage, so a count can be read
  // without leaving the overview. The rail's own view carries the jump. In an app
  // with no session there is nothing to report to, so the row is a plain box.
  type Props = {
    reading: Reading;
  };
  let { reading }: Props = $props();

  const inspector = getInspector();
  const selection = $derived<InspectSelection>({
    kind: 'instrument-reading',
    readingId: reading.id,
  });
  const showing = $derived(inspector?.isShowing(selection) ?? false);
  const navigable = $derived(inspector !== null);

  function inspect(): void {
    inspector?.show(selection);
  }

  // A tinted band, not a bordered card: full-bleed inside the ledger's hairlines,
  // so an exceptional reading reads as a highlighted row rather than as one more
  // box among eight.
  const BAND: Record<ReadingTone, string> = {
    advise: 'bg-warning/10',
    gap: 'bg-destructive/10',
  };
  // Hover deepens a row's OWN tone rather than switching it to neutral.
  const BAND_HOVER: Record<ReadingTone, string> = {
    advise: 'hover:bg-warning/20',
    gap: 'hover:bg-destructive/20',
  };
  // Values are 20px/600 — large text, so 3:1 suffices and the brick clears it on
  // both surfaces. Amber does NOT: `--warning` is a fill at 1.95:1 on a light well,
  // which is why the ink variant exists (4.80:1 light / 7.20:1 dark).
  const VALUE_INK: Record<ReadingTone, string> = {
    advise: 'text-warning-ink',
    gap: 'text-destructive',
  };

  const tone = $derived(reading.tone);
  const rowClass = $derived(
    cn(
      'flex w-full flex-wrap items-baseline gap-x-3 gap-y-0.5 px-2 py-2.5 text-left transition-colors',
      tone ? BAND[tone] : undefined,
      navigable && 'cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring',
      navigable && (tone ? BAND_HOVER[tone] : 'hover:bg-foreground/5'),
      // Where the rail is reading THIS row, the same way a selected spoke inks its axis.
      showing && 'ring-1 ring-inset ring-ring',
    ),
  );

  // Spread rather than conditional attributes: the row is a real <button> where a
  // session exists and a plain box where none does, and a spread keeps that as ONE
  // markup path instead of two near-identical branches.
  const interactive = $derived<Record<string, unknown>>(
    navigable ? { type: 'button', 'aria-pressed': showing, onclick: inspect } : {},
  );
</script>

<li>
  <svelte:element this={navigable ? 'button' : 'div'} class={rowClass} {...interactive}>
    <!-- Right-aligned and tabular so the eight counts form a column the eye can
     run down, whatever their digit width. -->
    <span
      class={cn(
        'w-10 shrink-0 text-right text-xl font-semibold tabular-nums',
        tone ? VALUE_INK[tone] : 'text-foreground',
      )}>{reading.value}</span>
    <span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >{reading.label}</span>
    <!-- The qualifier lifts to full ink on a toned row rather than taking the
     tone's colour: it is 11px, so it needs 4.5:1, and the brick measures 3.3:1
     on the dark well. The tone is already carried by the value and the band —
     this line's job is to say, legibly, what the tone is about. -->
    <span class={cn('ml-auto text-2xs', tone ? 'text-foreground' : 'text-muted-foreground')}
      >{reading.note}</span>
  </svelte:element>
</li>
