<script lang="ts">
  import { LINK_KINDS, LINK_KIND_LABELS, type RecommendationLinkKind } from '../../author';
  import { Button } from '../button';
  import { Field, Select } from '../forms';

  // Add one target: what kind of thing, which one, then Link. Two captioned
  // selects rather than two bare boxes — an unlabelled pair reading "Question"
  // and a question's text says nothing about which is the kind and which the
  // choice, and this row sits directly under a list where both already appear.
  
  // It holds no link state of its own: the kind and the picked target live in
  // the section above, because resetting the target when the kind changes is
  // that section's rule to keep.
  type Props = {
    kind: RecommendationLinkKind;
    targets: { id: string; label: string }[];
    targetId: string;
    onKind: (kind: string) => void;
    onTarget: (id: string) => void;
    onLink: () => void;
  };
  let { kind, targets, targetId, onKind, onTarget, onLink }: Props = $props();
</script>

<div class="flex flex-wrap items-end gap-2">
  <Field label="kind" class="w-40 shrink-0">
    <Select
      density="compact"
      aria-label="Link kind"
      value={kind}
      onchange={(e) => onKind(e.currentTarget.value)}
    >
      {#each LINK_KINDS as k (k)}<option value={k}>{LINK_KIND_LABELS[k]}</option>{/each}
    </Select>
  </Field>
  <Field label="target" class="min-w-0 grow basis-64">
    <Select
      density="compact"
      aria-label="Link target"
      value={targetId}
      onchange={(e) => onTarget(e.currentTarget.value)}
    >
      {#each targets as t (t.id)}<option value={t.id}>{t.label}</option>{/each}
    </Select>
  </Field>
  <Button variant="outline" disabled={targetId === ''} onclick={onLink}>Link</Button>
</div>
