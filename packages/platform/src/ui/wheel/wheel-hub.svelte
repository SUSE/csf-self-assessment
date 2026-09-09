<script lang="ts">
  import type { Snippet } from 'svelte';
  import { CX, CY, HUB } from './geometry';

  // The disc at the centre, drawn last so spokes run under it. What it says is the
  // caller's business — each wheel's headline reads differently — so the content
  // comes in as a snippet.
  type Props = { children?: Snippet };
  let { children }: Props = $props();
</script>

<circle cx={CX} cy={CY} r={HUB} fill="currentColor" class="text-background" />
<circle cx={CX} cy={CY} r={HUB} fill="none" stroke="currentColor" stroke-width="0.5" class="text-border" />
{@render children?.()}
