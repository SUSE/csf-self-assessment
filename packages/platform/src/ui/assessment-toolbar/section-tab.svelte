<script lang="ts">
  import HeaderIconButton from '../workbench/stage-header/header-icon-button.svelte';
  import { SECTION_META } from './model';
  import type { AssessmentSection } from './model';

  // One section tab. Its own component because the row is no longer one loop —
  // Current question renders separately, beside the nav divider.
  type Props = {
    section: AssessmentSection;
    active: boolean;
    disabled?: boolean;
    onclick: () => void;
  };
  let { section, active, disabled = false, onclick }: Props = $props();

  const meta = $derived(SECTION_META[section]);
</script>

<HeaderIconButton
  label={meta.label}
  Icon={meta.Icon}
  rule={meta.rule}
  {active}
  {disabled}
  {onclick}
/>
