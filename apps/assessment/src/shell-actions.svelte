<script lang="ts">
  import { buttonVariants } from '@csf/platform/ui/button';
  import * as AlertDialog from '@csf/platform/ui/alert-dialog';
  import * as Tooltip from '@csf/platform/ui/tooltip';
  import BookOpen from '@lucide/svelte/icons/book-open';
  import Download from '@lucide/svelte/icons/download';
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
  import type { Facilitator } from './facilitator/facilitator.svelte';
  import type { Fill } from './fill/fill.svelte';
  import type { Load } from './load.svelte';

  // The header's actions, a reading of what is loaded: one Load always, the export
  // the live persona can produce, and Reset. There is no role switch — the file you
  // Load chooses the persona. Read lives on the stage toolbar beside the other
  // destinations, not here.
  type Props = {
    fill: Fill;
    facilitator: Facilitator;
    load: Load;
  };
  let { fill, facilitator, load }: Props = $props();

  const merge = $derived(facilitator.merge);
  let confirmResetOpen = $state(false);

  // Wipes every key this browser stored, then reloads. `csf-theme` self-heals on
  // reload, so a reset keeps the theme.
  function resetApp(): void {
    try {
      localStorage.clear();
    } catch {
      // Best-effort — if storage is unavailable there was nothing to clear.
    }
    location.reload();
  }
</script>

<Tooltip.Provider delayDuration={300}>
  <!-- Sniffed by shape: workbook → Facilitator, anything else → the fill flow. -->
  <Tooltip.Root>
    <Tooltip.Trigger
      class={buttonVariants({ variant: 'outline', size: 'icon' })}
      aria-label="Load"
      onclick={() => load.open()}
    >
      <BookOpen class="size-4" />
    </Tooltip.Trigger>
    <Tooltip.Content>
      {load.mode === 'facilitator'
        ? 'Load a returned partial or workbook-assessment to merge'
        : load.mode === 'fill'
          ? 'Load another workbook-assessment or saved assessment'
          : 'Load a workbook to prepare it, or a workbook-assessment to fill it'}
    </Tooltip.Content>
  </Tooltip.Root>

  <!-- Export the partial — the participant, while still filling. -->
  {#if !facilitator.active && fill.answering}
    <Tooltip.Root>
      <Tooltip.Trigger
        class={buttonVariants({ variant: 'outline', size: 'icon' })}
        aria-label="Export partial"
        onclick={() => fill.exportPartial()}
        disabled={fill.needsName}
      >
        <Download class="size-4" />
      </Tooltip.Trigger>
      <Tooltip.Content>
        {fill.needsName ? 'Enter your name on Overview to export' : 'Export partial'}
      </Tooltip.Content>
    </Tooltip.Root>
  {/if}

  <!-- Enabled once something has landed and nothing is still under review, so a
     partially decided landing can never be exported. -->
  {#if facilitator.active && merge.workbookAssessment}
    <Tooltip.Root>
      <Tooltip.Trigger
        class={buttonVariants({ variant: 'outline', size: 'icon' })}
        aria-label="Export final assessment"
        onclick={() => merge.exportFinalized()}
        disabled={!merge.canExportFinal}
      >
        <Download class="size-4" />
      </Tooltip.Trigger>
      <Tooltip.Content>
        {merge.incoming !== null
          ? 'Land the partial under review to export'
          : merge.ledger.length === 0
            ? 'Land a partial before exporting'
            : 'Export final assessment'}
      </Tooltip.Content>
    </Tooltip.Root>
  {/if}

  <Tooltip.Root>
    <Tooltip.Trigger
      class={buttonVariants({ variant: 'outline', size: 'icon' })}
      aria-label="Reset"
      onclick={() => (confirmResetOpen = true)}
    >
      <RotateCcw class="size-4" />
    </Tooltip.Trigger>
    <Tooltip.Content>Reset — clear all stored data and start over</Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>

<!-- Unrecoverable unless the work was exported. -->
<AlertDialog.Root bind:open={confirmResetOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Reset and clear everything?</AlertDialog.Title>
      <AlertDialog.Description>
        This clears all data stored in this browser — your in-progress assessment,
        any imported workbook, and merge progress across both personas — then
        reloads to a clean slate. You can't undo this; export anything you want to
        keep first.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action onclick={resetApp}>Reset everything</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
