<script lang="ts">
  import type { RecommendationRow } from '../../author';
  import { Chip } from '../chip';
  import { ConfirmDelete } from '../confirm-delete';
  import RecommendationBadges from './recommendation-badges.svelte';

  // ONE catalogue row: what the author needs to recognise a pitch without
  // opening it — its title, id, when it fires, and what it points at. The row
  // itself opens the editor. delete sits outside that control so a mis-aimed
  // click on the row can never remove anything.
  
  // The TITLE leads. The ids here are long shared-prefix slugs
  // (`suse-strategic-digital-sovereign…`), so a mono id column in the leading
  // position is eleven near-identical truncated strings where the scan starts.
  // the title is the handle an author actually recognises. The id follows as a
  // fixed column, which is what makes the set read as a table.
  
  // Growth goes to the LINKS column, not to the title. Titles are short and a
  // grown title column just opens a dead gutter between a row's name and its
  // metadata. the attached-question labels are the part that was truncating at
  // 200px while 800px of the row sat empty.
  type Props = {
    row: RecommendationRow;
    /** This recommendation owns at least one strict-validation issue.*/
    flagged: boolean;
    /** SEAL level name for the trigger, from the workbook's own sealLevels.*/
    sealName: string;
    onOpen: () => void;
    onRemove: () => void;
  };
  let { row, flagged, sealName, onOpen, onRemove }: Props = $props();

  const rec = $derived(row.recommendation);
</script>

<li class="flex items-center gap-2">
  <!-- Quiet at rest, filled on hover and focus: eleven separate filled pills
     read as a stack of boxes, hairline-ruled rows read as the table this is.
     A fill rather than a ring, so nothing reflows by a pixel. -->
  <button
    type="button"
    class="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 rounded-sm px-2 py-1.5 text-left hover:bg-well focus-visible:bg-well"
    onclick={onOpen}
  >
    <span class="min-w-0 grow basis-64 truncate text-sm text-foreground">
      {rec.title || '(untitled recommendation)'}
    </span>
    <span class="w-64 shrink-0 truncate font-mono text-xs text-muted-foreground">{rec.id}</span>
    <span class="flex shrink-0 items-center gap-2">
      <RecommendationBadges recommendation={rec} {sealName} />
    </span>
    {#if row.links.length === 0}
      <!-- Not a validation failure, but the one state worth naming on the row:
     a recommendation with no link never fires. -->
      <span class="min-w-0 grow-[3] basis-56">
        <Chip size="sm" tone="attention">unlinked</Chip>
      </span>
    {:else}
      <span class="min-w-0 grow-[3] basis-56 truncate text-xs text-muted-foreground">
        {row.links.map((l) => l.label).join(' · ')}
      </span>
    {/if}
    <span
      class="size-2 shrink-0 rounded-full {flagged ? 'bg-destructive' : 'bg-transparent'}"
      aria-label={flagged ? 'Has an issue' : undefined}
    ></span>
  </button>
  <ConfirmDelete label="recommendation" onconfirm={onRemove} />
</li>
