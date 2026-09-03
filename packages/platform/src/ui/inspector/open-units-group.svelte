<script lang="ts">
  import type { OpenGroup } from '../../analytics';
  import GroupHeading from './group-heading.svelte';
  import QuestionBlockList from './question-block-list.svelte';
  import { openUnitBlocks } from './question-blocks';

  // One owner's open units, read as the questions they are open on — the same blocks the
  // heat rail uses, so a question looks the same wherever a rail lists one. The heading
  // is dropped when the owner IS the subject: the panel title already names it.
  type Props = {
    group: OpenGroup;
    heading: boolean;
    onOpenQuestion?: ((id: string) => void) | undefined;
  };
  let { group, heading, onOpenQuestion }: Props = $props();

  const blocks = $derived(openUnitBlocks(group));
</script>

<section data-open-units-group={group.key} class="space-y-3">
  {#if heading}
    <GroupHeading label={group.label} count={group.units.length} />
  {/if}
  <QuestionBlockList {blocks} onOpen={onOpenQuestion} />
</section>
