<script lang="ts">
  import CircleQuestionMark from '@lucide/svelte/icons/circle-question-mark';
  import HeaderIconButton from '../workbench/stage-header/header-icon-button.svelte';
  import { getHelp } from './help.svelte';

  // The stage-header control that turns help mode on, and the one header button
  // help mode does not gate (`helpExempt`) — it has to stay pressable to be the
  // way back out. It reads as PRESSED for as long as help mode lasts, because the
  // rest of the header behaves differently while it is.
  //
  // Renders nothing without a session: an app that never called `createHelp` has
  // no rulebook, and an icon that opens an empty panel is worse than no icon.
  const help = getHelp();
</script>

{#if help}
  <HeaderIconButton
    label={help.open ? 'Leave help mode' : 'Rulebook — explain this screen'}
    Icon={CircleQuestionMark}
    active={help.open}
    helpExempt
    onclick={() => help.toggle()}
  />
{/if}
