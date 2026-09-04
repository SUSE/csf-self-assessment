<script lang="ts">
  import { ribbonModel, tileMaximises, type TileId } from '../../analytics';
  import type { Party, Workbook } from '../../schema';
  import type { EngineResult } from '../../score-engine';
  import CompletenessRibbon from './completeness-ribbon.svelte';
  import ProvenanceToggle from './provenance-toggle.svelte';
  import { TILES, type TileEntry } from './registry';
  import { controlSection, focusedTile, tileSections } from './sections';
  import TileFrame from './tile-frame.svelte';
  import TileSection from './tile-section.svelte';

  // The dashboard surface: one ribbon over the registered tiles, grouped by
  // section. Maximise is a view the app owns (analytics §4.3), so it arrives as
  // a prop and leaves as a callback — never private widget state.
  let {
    result,
    workbook,
    parties,
    maximised,
    onMaximise,
    onOpenQuestion,
  }: {
    result: EngineResult;
    workbook: Workbook;
    parties: Party[];
    maximised: TileId | null;
    onMaximise: (id: TileId | null) => void;
    onOpenQuestion: (questionId: string) => void;
  } = $props();

  let selection = $state<{ tile: TileId; mark: string } | null>(null);
  // A reading aid, not a view: §4.3 makes only maximise restorable, so the tint
  // stays local and never reaches the view store.
  let tint = $state(false);
  const ribbon = $derived(ribbonModel(result));
  const sections = $derived(tileSections(TILES));
  const focused = $derived(focusedTile(TILES, maximised));
  // The tint control sits with the marks it changes rather than over the whole
  // grid: on the heading of the first section holding a tinting tile, and above
  // a maximised tile only when that tile tints. Other tinting tiles further down
  // (the estate wheel) follow the same switch — one state, shown where it first
  // bites, so it is never a dashboard-wide control with nothing under it.
  const tintSection = $derived(controlSection(sections, 'tints'));
</script>

{#snippet placedTile(entry: TileEntry)}
  {@render tile(entry, false)}
{/snippet}

{#snippet tile(entry: TileEntry, isMaximised: boolean)}
  <TileFrame
    def={entry.def}
    maximised={isMaximised}
    onToggle={() => { selection = null; onMaximise(isMaximised ? null : entry.def.id); }}>
    <entry.component
      {result} {workbook} {parties} {onOpenQuestion} {tint}
      maximised={isMaximised}
      selected={selection?.tile === entry.def.id ? selection.mark : null}
      onSelect={(mark) => {
        selection = mark === null ? null : { tile: entry.def.id, mark };
        // §4.4.2 maximises on a mark press so the detail has room — but only
        // where the tile has a maximised reading to show it in. In a tile that
        // declares none, the press marks and nothing moves.
        if (!isMaximised && mark !== null && tileMaximises(entry.def)) onMaximise(entry.def.id);
      }} />
  </TileFrame>
{/snippet}

<div class="flex flex-col gap-4">
  <CompletenessRibbon model={ribbon} />
  {#if focused}
    <div data-dashboard-mode="maximised" class="grid grid-cols-1">
      {#if focused.def.tints === true}
        <ProvenanceToggle {tint} onToggle={() => { tint = !tint; }} class="mb-3" />
      {/if}
      {@render tile(focused, true)}
    </div>
  {:else}
    <div data-dashboard-mode="grid" class="flex flex-col gap-6">
      {#each sections as group (group.section)}
        <TileSection
          {group}
          {tint}
          onTint={() => { tint = !tint; }}
          showTint={group.section === tintSection}
          tile={placedTile} />
      {/each}
    </div>
  {/if}
</div>
