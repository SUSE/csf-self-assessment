<script lang="ts">
  import * as AlertDialog from '../alert-dialog';
  import { Button } from '../button';

  // A confirm-gated NON-destructive action — the twin of ConfirmDelete for a
  // change that is not a removal (moving the single `assessed` party flag). One
  // AlertDialog confirmation so the copy stays consistent app-wide. the action
  // fires only from the dialog's confirm, never the trigger click.
  type Props = {
    trigger: string;
    title: string;
    body: string;
    confirmLabel: string;
    onconfirm: () => void;
  };
  let { trigger, title, body, confirmLabel, onconfirm }: Props = $props();

  let open = $state(false);

  function confirm(): void {
    open = false;
    onconfirm();
  }
</script>

<Button variant="outline" size="sm" onclick={() => (open = true)}>{trigger}</Button>

<AlertDialog.Root bind:open>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>{title}</AlertDialog.Title>
      <AlertDialog.Description>{body}</AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action onclick={confirm}>{confirmLabel}</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
