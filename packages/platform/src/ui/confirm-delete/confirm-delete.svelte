<script lang="ts">
  import * as AlertDialog from '../alert-dialog';
  import * as Tooltip from '../tooltip';
  import { buttonVariants } from '../button';
  import Trash2 from '@lucide/svelte/icons/trash-2';

  // A destructive-delete affordance: the red trash icon (tooltipped like the
  // header actions) gated behind an AlertDialog confirmation. Every delete in
  // the app routes through this so the copy and the guard stay consistent — the
  // action only fires from the dialog's confirm, never the icon click.
  type Props = {
    // The thing being removed, e.g. 'provider'. Fills the tooltip, the dialog
    // title, and the confirm button — keep it a bare noun, lower-case.
    label: string;
    // Optional dialog body. Defaults to a generic can't-be-undone line.
    description?: string;
    disabled?: boolean;
    onconfirm: () => void;
  };
  let { label, description, disabled = false, onconfirm }: Props = $props();

  let open = $state(false);

  function confirm(): void {
    open = false;
    onconfirm();
  }
</script>

<Tooltip.Provider delayDuration={300}>
  <Tooltip.Root>
    <Tooltip.Trigger
      class={buttonVariants({ variant: 'outline', size: 'icon' })}
      aria-label={`Remove ${label}`}
      {disabled}
      onclick={() => (open = true)}
    >
      <Trash2 class="size-4 text-destructive-ink" />
    </Tooltip.Trigger>
    <Tooltip.Content>Remove {label}</Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>

<AlertDialog.Root bind:open>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Remove this {label}?</AlertDialog.Title>
      <AlertDialog.Description>
        {description ?? `This removes the ${label} from the workbook and can’t be undone.`}
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        onclick={confirm}
      >
        Remove {label}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
