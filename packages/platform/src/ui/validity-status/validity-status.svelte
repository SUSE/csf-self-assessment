<script lang="ts" module>
  import CircleCheck from '@lucide/svelte/icons/circle-check';
  import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
  import { cn } from '../../utils/cn';
  import { Chip } from '../chip';

  // Whether the draft workbook passes strict validation, said in the header next
  // to the modes it gates. One chip, two states: a quiet outline when the
  // workbook parses, and a red PRESSABLE chip that jumps to the first issue when
  // it does not. The count is the carrier — "valid" on its own named no subject,
  // so the wording says what was checked ("Workbook valid" / "3 issues") and the
  // tooltip says what it unlocks.
  export type ValidityStatusProps = {
    class?: string | undefined;
    /** Strict-validation issues on the draft; zero means it parses. */
    issueCount: number;
    /** Jump to the first issue. Only reachable in the failing state. */
    onGoToIssue: () => void;
  };
</script>

<script lang="ts">
  let { class: className, issueCount, onGoToIssue }: ValidityStatusProps = $props();

  const ok = $derived(issueCount === 0);
</script>

<Chip
  as={ok ? 'span' : 'button'}
  tone={ok ? 'neutral' : 'danger'}
  class={cn(
    'h-7 gap-1.5 px-2.5',
    !ok &&
      'transition-colors hover:bg-destructive/25 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
    className,
  )}
  title={ok
    ? 'The workbook passes strict validation — Preview and Dashboard are open'
    : 'Jump to the first issue'}
  {...ok ? {} : { type: 'button', onclick: onGoToIssue }}
>
  {#snippet icon()}
    {#if ok}
      <CircleCheck class="size-3.5" aria-hidden="true" />
    {:else}
      <TriangleAlert class="size-3.5" aria-hidden="true" />
    {/if}
  {/snippet}
  {#if ok}
    Workbook valid
  {:else}
    {issueCount} issue{issueCount === 1 ? '' : 's'}
  {/if}
</Chip>
