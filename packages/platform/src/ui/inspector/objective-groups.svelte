<script lang="ts">
  import GroupHeading from './group-heading.svelte';
  import QuestionBlockList from './question-block-list.svelte';
  import type { ObjectiveGroupView } from './question-blocks';

  // Questions grouped by the objective (SOV) that owns them — the shape any rail
  // listing questions from across the instrument wants. Build the groups with
  // `byObjective`; this renders them and decides nothing.
  let {
    groups,
    onOpen,
    empty,
  }: {
    groups: ObjectiveGroupView[];
    onOpen?: ((id: string) => void) | undefined;
    /** Shown when no objective has anything to list. */
    empty?: string | undefined;
  } = $props();
</script>

{#if groups.length === 0}
  {#if empty}<p class="text-xs text-muted-foreground">{empty}</p>{/if}
{:else}
  {#each groups as group (group.objectiveId)}
    <section data-objective-group={group.objectiveId} class="space-y-3">
      <GroupHeading code={group.objectiveId} label={group.objectiveName} count={group.blocks.length} />
      <QuestionBlockList blocks={group.blocks} {onOpen} />
    </section>
  {/each}
{/if}
