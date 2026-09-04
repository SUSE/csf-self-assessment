<script lang="ts">
  import Diamond from './diamond.svelte';
  import LegendItem from './legend-item.svelte';

  // The wheel's mark vocabulary. Length can't be a static swatch, so it rides the
  // caption. the discrete marks each show the glyph they stand for. Left-aligned
  // under the figure it annotates — centred text is barred by the brand guide, and
  // centring left the caption's last word orphaned on its own line at most widths.
  // Internal to instrument-wheel.
  type Props = {
    /** A facilitator's answers are loaded: explain the `◈N` seal suffix too.*/
    reflecting?: boolean;
  };
  let { reflecting = false }: Props = $props();
</script>

<div class="space-y-2 text-2xs leading-relaxed text-muted-foreground">
  <p class="max-w-prose text-pretty">
    Spoke length is how many questions land on that axis — the busiest reaches the rim. A label's
    number is its question count, <span class="text-foreground">◇N</span> its strata. Party types
    are fixed branches.
  </p>
  {#if reflecting}
    <p class="max-w-prose text-pretty">
      <!-- Names the ramp by INTENSITY, not by hue: the SEAL ramp is one hue that
     follows the active palette, so "green" / "red" would be a lie
     under every palette but SUSE. -->
      <span class="text-foreground">◈N</span> marks the lowest selected SEAL on that axis
      (<span class="text-seal-4">vivid</span> sovereign, <span class="text-seal-0">pale</span>
      exposed); a <span class="text-foreground">—</span> is in scope but unanswered.
    </p>
  {/if}
  <div class="flex flex-wrap items-center gap-x-4 gap-y-2 leading-none">
    <!-- The two emphasis steps, in the same order the wheel uses them. -->
    <LegendItem w={24} viewBox="0 0 24 12" ink="text-axis-ink" label="Gates the floor">
      <line x1="1" y1="6" x2="20" y2="6" stroke="currentColor" stroke-width="6" />
      <line x1="20" y1="1.5" x2="20" y2="10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    </LegendItem>
    <LegendItem w={24} viewBox="0 0 24 12" ink="text-axis-ink-soft" label="Scores only">
      <line x1="1" y1="6" x2="20" y2="6" stroke="currentColor" stroke-width="6" />
      <line x1="20" y1="1.5" x2="20" y2="10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    </LegendItem>
    <!-- No `Stratum` swatch: with the diamonds off the plot area, a glyph sitting
     among the bar and node marks would advertise a chart mark that no longer
     exists. `◇N` is a label suffix now, and the caption above already names it
     in the one place the reader meets it. -->
    <LegendItem w={24} viewBox="0 0 24 12" ink="text-destructive" label="No question yet">
      <line x1="2" y1="6" x2="16" y2="6" stroke="currentColor" stroke-width="6" stroke-dasharray="2 3" stroke-linecap="butt" />
    </LegendItem>
    <!-- Party nodes double-code: the same two emphasis steps as the bars, plus
     solid vs hollow, so the pair survives greyscale and a colour deficiency. -->
    <LegendItem viewBox="0 0 12 12" ink="text-axis-ink" label="Assessed party">
      <circle cx="6" cy="6" r="4" fill="currentColor" />
    </LegendItem>
    <LegendItem viewBox="0 0 12 12" ink="text-axis-ink-soft" label="Third party">
      <circle cx="6" cy="6" r="4" fill="var(--background)" stroke="currentColor" stroke-width="1.75" />
    </LegendItem>
    {#if reflecting}
      <LegendItem viewBox="0 0 12 12" ink="text-seal-4" label="Lowest selected SEAL">
        <Diamond cx={6} cy={6} r={5} filled />
      </LegendItem>
    {/if}
  </div>
</div>
