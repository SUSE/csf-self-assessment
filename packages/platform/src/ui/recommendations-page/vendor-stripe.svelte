<script lang="ts">
  import { cn } from '../../utils/cn';
  import { VENDOR_ACCENTS } from './accent';

  // The vendor plane's signature: the whole fixed series in one rule, so the page
  // announces its colours before any single card claims one.
  let { class: className }: { class?: string | undefined } = $props();
</script>

<div aria-hidden="true" class={cn('flex h-1.5 w-full', className)}>
  {#each VENDOR_ACCENTS as accent, i (i)}
    <span class="flex-1 {accent.bar}"></span>
  {/each}
</div>
