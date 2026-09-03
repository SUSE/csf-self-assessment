<script lang="ts">
  import Check from '@lucide/svelte/icons/check';
  import { Chip } from '../chip';

  // One toggle chip — the single selection idiom across roles, dimensions and
  // parties. Selected reads affirmative; the check is the non-colour signal so
  // selection survives a mono/high-contrast view.
  type Props = {
    label: string;
    selected: boolean;
    onToggle: () => void;
  };
  let { label, selected, onToggle }: Props = $props();
</script>

<Chip
  as="button"
  type="button"
  tone={selected ? 'strong' : 'neutral'}
  aria-pressed={selected}
  onclick={onToggle}
  class="gap-1.5 px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring {selected
    ? 'border-primary/50 bg-primary/10'
    : 'hover:border-foreground/30 hover:text-foreground'}"
>
  {#snippet icon()}
    {#if selected}<Check class="size-3.5 text-primary" aria-hidden="true" />{/if}
  {/snippet}
  {label}
</Chip>
