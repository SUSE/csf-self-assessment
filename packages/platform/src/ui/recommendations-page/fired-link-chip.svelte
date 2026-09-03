<script lang="ts">
  import type { FiredLink } from '../../analytics';
  import { chipVariants } from '../chip';
  import { sealSwatchClass } from '../../utils/seal-color';

  // One link that fired, worded once. The trigger is the only part of an offer that
  // carries the seal hue (analytics invariant #7); the rest are plain chips.
  let { fired, trigger = false }: { fired: FiredLink; trigger?: boolean } = $props();
</script>

<span
  data-recommendation-trigger={trigger ? '' : undefined}
  data-recommendation-fired={trigger ? undefined : ''}
  data-seal={fired.seal}
  class={trigger
    ? `inline-flex w-fit items-center gap-2 rounded px-2 py-1 text-xs ${sealSwatchClass(fired.seal)}`
    : chipVariants({ size: 'sm' })}
>
  {`${fired.label} · SEAL-${fired.seal}`}
</span>
