<script lang="ts">
  import type { SealLevel } from '../../schema';
  import { sealInkClass } from '../../utils/seal-color';

  // One rung of the authored scale — a definition, not the answering rung in ui/ladder.
  type Props = {
    level: SealLevel;
    /** The reading sits here.*/
    atFloor: boolean;
  };
  let { level, atFloor }: Props = $props();
</script>

<li
  data-seal-rung={level.seal}
  data-at-floor={atFloor ? 'true' : undefined}
  class={`rounded-md border p-2 ${atFloor ? 'border-foreground bg-muted' : 'border-border'}`}>
  <p class="text-sm font-medium text-card-foreground">
    <span data-seal={level.seal} class={sealInkClass(level.seal)}>SEAL-{level.seal}</span>
    {level.name}
  </p>
  <p class="text-xs text-muted-foreground">{level.description}</p>
</li>
