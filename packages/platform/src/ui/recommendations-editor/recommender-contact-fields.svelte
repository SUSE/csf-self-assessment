<script lang="ts">
  import type { Workbook } from '../../schema';
  import { setRecommender } from '../../author';
  import { Field, Input } from '../forms';

  // The call to action's two halves, revealed by the block's checkbox. Their own
  // component because they are a branch of the block's template with a reason to
  // change of their own; the both-or-neither rule still lives in setRecommender.
  type Props = {
    draft: Workbook;
    onDraft: (next: Workbook) => void;
  };
  let { draft, onDraft }: Props = $props();
</script>

<Field label="contact label" class="w-40">
  <Input
    density="compact"
    data-rule="3.8"
    placeholder="Talk to an Expert"
    value={draft.recommender?.contact?.label ?? ''}
    oninput={(e) => onDraft(setRecommender(draft, { contactLabel: e.currentTarget.value }))}
  />
</Field>
<Field label="contact url" class="w-56">
  <Input
    density="compact"
    data-rule="3.8"
    placeholder="https://…"
    value={draft.recommender?.contact?.url ?? ''}
    oninput={(e) => onDraft(setRecommender(draft, { contactUrl: e.currentTarget.value }))}
  />
</Field>
