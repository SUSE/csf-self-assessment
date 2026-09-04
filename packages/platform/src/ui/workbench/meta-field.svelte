<script lang="ts">
  import { DetailField } from '../details-card';
  import { Input } from '../forms';
  import type { MetaFieldSpec } from '../workbook-facts/meta-fields';

  // One editable workbook-meta field: the DetailField caption over a compact
  // Input, committed through the caller's pure op. Internal to ui/workbench — it
  // exists because the three meta fields differed only in width, face, and
  // whether they commit on input or on blur, and spelling that out three times
  // was how the id, version and title inputs drifted to three hand-written class
  // strings that no longer matched the styled Input primitive.
  type Props = {
    spec: MetaFieldSpec;
    value: string;
    onCommit: (value: string) => void;
  };
  let { spec, value, onCommit }: Props = $props();
</script>

<DetailField label={spec.label} grow={spec.grow} class={spec.fieldClass}>
  {#snippet control()}
    <Input
      density="compact"
      class={spec.mono ? 'font-mono text-xs' : undefined}
      {value}
      oninput={spec.commit === 'input'
        ? (e) => onCommit(e.currentTarget.value)
        : undefined}
      onchange={spec.commit === 'change'
        ? (e) => onCommit(e.currentTarget.value)
        : undefined}
    />
  {/snippet}
</DetailField>
