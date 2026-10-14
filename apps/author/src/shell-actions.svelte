<script lang="ts">
  import type { LucideIcon } from '@lucide/svelte';
  import { Button, buttonVariants } from '@csf/platform/ui/button';
  import * as AlertDialog from '@csf/platform/ui/alert-dialog';
  import * as Tooltip from '@csf/platform/ui/tooltip';
  import { exportIssuesWarning } from '@csf/platform/ui/workbench';
  import BookOpen from '@lucide/svelte/icons/book-open';
  import FilePlus from '@lucide/svelte/icons/file-plus';
  import Download from '@lucide/svelte/icons/download';

  // The header's file actions. New and Import both overwrite the active workbook,
  // which lives only in this browser, so with one open they are staged behind the
  // confirm below and run only on confirm. Export is staged behind a warning
  // dialog if the workbook has validation issues.
  type Props = {
    hasDraft: boolean;
    issueCount?: number;
    onNew: () => void;
    onImport: () => void | Promise<void>;
    onExport: () => void | Promise<void>;
    onReviewIssues?: () => void;
  };
  let { hasDraft, issueCount = 0, onNew, onImport, onExport, onReviewIssues }: Props = $props();

  let confirmReplaceOpen = $state(false);
  let confirmExportOpen = $state(false);
  let pendingReplace = $state<(() => void | Promise<void>) | null>(null);

  const exportWarning = $derived(exportIssuesWarning(issueCount));

  function guardReplace(action: () => void | Promise<void>): void {
    if (hasDraft) {
      pendingReplace = action;
      confirmReplaceOpen = true;
    } else {
      void action();
    }
  }

  function confirmReplace(): void {
    const action = pendingReplace;
    pendingReplace = null;
    confirmReplaceOpen = false;
    void action?.();
  }

  function handleExport(): void {
    if (exportWarning !== null) {
      confirmExportOpen = true;
    } else {
      void onExport();
    }
  }

  function confirmExport(): void {
    confirmExportOpen = false;
    void onExport();
  }

  const actions = $derived<
    { label: string; Icon: LucideIcon; disabled?: boolean; onclick: () => void }[]
  >([
    { label: 'New workbook', Icon: FilePlus, onclick: () => guardReplace(onNew) },
    { label: 'Import workbook', Icon: BookOpen, onclick: () => guardReplace(onImport) },
    { label: 'Export workbook', Icon: Download, disabled: !hasDraft, onclick: handleExport },
  ]);
</script>

<Tooltip.Provider delayDuration={300}>
  {#each actions as action (action.label)}
    <Tooltip.Root>
      <Tooltip.Trigger
        class={buttonVariants({ variant: 'outline', size: 'icon' })}
        aria-label={action.label}
        disabled={action.disabled}
        onclick={action.onclick}
      >
        <action.Icon class="size-4" />
      </Tooltip.Trigger>
      <Tooltip.Content>{action.label}</Tooltip.Content>
    </Tooltip.Root>
  {/each}
</Tooltip.Provider>

<AlertDialog.Root bind:open={confirmReplaceOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Replace the current workbook?</AlertDialog.Title>
      <AlertDialog.Description>
        The workbook you're editing is stored only in this browser. Loading a new
        one overwrites it — you'll lose your current work unless you export it
        first.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action onclick={confirmReplace}>Discard &amp; continue</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<AlertDialog.Root bind:open={confirmExportOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>{exportWarning?.title ?? 'Export workbook with issues?'}</AlertDialog.Title>
      <AlertDialog.Description>
        {exportWarning?.description ?? ''}
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      {#if onReviewIssues}
        <Button
          variant="outline"
          onclick={() => {
            confirmExportOpen = false;
            onReviewIssues();
          }}
        >
          Review issues
        </Button>
      {/if}
      <AlertDialog.Action onclick={confirmExport}>
        {exportWarning?.action ?? 'Export anyway'}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
