<script lang="ts">
  import CircleSlash from '@lucide/svelte/icons/circle-slash';
  import Diamond from '@lucide/svelte/icons/diamond';
  import type { Seal } from '../../schema';
  import { cn } from '../../utils/cn';
  import SealBadge from './seal-badge.svelte';

  // One answer's reading as a mark: a rung is the ladder's own ramp chip, so a SEAL
  // scanned anywhere is the same chip. Off-ladder readings are not ranks and never
  // take a ramp colour — they get the inert muted square (`◇` don't know, `⊘`
  // doesn't apply), so the badge column keeps one width and one baseline.
  type Props = {
    state: 'answered' | 'dont-know' | 'na';
    seal: Seal | null;
    class?: string | undefined;
  };
  let { state, seal, class: className }: Props = $props();

  const inert = $derived(
    state === 'dont-know'
      ? { icon: Diamond, title: 'Don’t know' }
      : state === 'na'
        ? { icon: CircleSlash, title: 'Doesn’t apply' }
        : null,
  );
</script>

{#if inert === null}
  <SealBadge {seal} class={className} />
{:else}
  <span
    class={cn(
      'grid size-6 shrink-0 place-items-center rounded bg-muted text-muted-foreground',
      className,
    )}
    title={inert.title}
    aria-label={inert.title}
  >
    <inert.icon class="size-3" />
  </span>
{/if}
