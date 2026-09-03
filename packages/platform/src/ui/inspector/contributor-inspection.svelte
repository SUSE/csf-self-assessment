<script lang="ts">
  import { contributorInspection, type ContributorUnit } from '../../analytics';
  import type { Party, Workbook } from '../../schema';
  import type { EngineResult } from '../../score-engine';
  import GroupHeading from './group-heading.svelte';
  import InspectionHeader from './inspection-header.svelte';
  import QuestionBlockList from './question-block-list.svelte';
  import { contributorBlocks } from './question-blocks';

  // ONE Inspector view: the slice of the credibility dial one contributor holds, read
  // as the answers standing because they placed them — grouped by how each one settled,
  // which is the provenance fact the dial cannot draw.
  //
  // Derived live, so a contributor a later landing has entirely superseded resolves to
  // nothing rather than to a stale count.
  type Props = {
    result: EngineResult | null;
    workbook: Workbook | null;
    parties: Party[];
    name: string;
    onOpenQuestion?: ((id: string) => void) | undefined;
  };
  let { result, workbook, parties, name, onOpenQuestion }: Props = $props();

  // Ledger order within a group, and the groups in the order a unit travels: nobody
  // else answered it, everyone agreed, or the room disagreed and it was resolved.
  const ORDER = ['sole source', 'agreed', 'resolved a clash'];

  const view = $derived(
    result && workbook ? contributorInspection(result, workbook, parties, name) : null,
  );
  const groups = $derived(
    view === null
      ? []
      : ORDER.map((settled) => ({
          key: settled,
          units: view.units.filter((unit: ContributorUnit) => unit.settled === settled),
        }))
          .filter((group) => group.units.length > 0)
          .map((group) => ({ ...group, blocks: contributorBlocks(group.units) })),
  );
</script>

<div class="flex h-full min-h-0 flex-col text-sm">
  {#if view === null}
    <p class="p-1 text-xs text-muted-foreground">
      Nothing this contributor placed still stands. Press another slice on Credibility.
    </p>
  {:else}
    <InspectionHeader title={view.name} count={view.count} note={view.note} />

    <div class="min-h-0 flex-1 space-y-6 overflow-y-auto overflow-x-hidden pt-3">
      {#each groups as group (group.key)}
        <section data-contributor-group={group.key} class="space-y-3">
          <GroupHeading label={group.key} count={group.units.length} />
          <QuestionBlockList blocks={group.blocks} onOpen={onOpenQuestion} />
        </section>
      {/each}
    </div>
  {/if}
</div>
