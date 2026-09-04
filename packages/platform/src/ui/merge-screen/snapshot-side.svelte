<script lang="ts">
  import type { SnapshotReading } from '../../merge';
  import { Inset, eyebrowVariants } from '../panel';
  import { SealBadge } from '../seal-badge';

  // One labelled side of an answer panel (landing-history §4.6): what stood here
  // before the Landing, or what stands here after. The two sides are PEERS — same
  // surface, same order, neither styled as the winner. An absent side says so. it
  // never shows SEAL-0 (§2.2.3). Every value arrives on the reading.
  type Props = { heading: string; reading: SnapshotReading; targetLabel: string };
  let { heading, reading, targetLabel }: Props = $props();
</script>

<!-- An Inset (ui/panel): one reading cut into the answer panel's card. It was a
     `bg-card` box inside a `bg-card` card, which is the same colour in all ten
     mode x palette combinations — the hairline was doing the whole job. -->
<Inset as="article" density="sm" class="min-w-0 space-y-1">
  <h5 class={eyebrowVariants({ weight: 'medium' })}>{heading}</h5>
  {#if reading.kind === 'absent'}
    <p class="text-sm text-muted-foreground">No standing answer</p>
  {:else}
    <p class="flex items-center gap-2 text-sm text-foreground">
      {reading.stateLabel}
      {#if reading.seal !== null}
        <SealBadge seal={reading.seal} />
        <span>SEAL-{reading.seal} · {reading.sealLevel}</span>
      {/if}
    </p>
    <p class="text-xs text-muted-foreground">
      {reading.placement === 'group' ? 'placed as a group' : 'placed individually'}
    </p>
    {#if reading.evidence !== null}
      <p class="text-xs text-muted-foreground break-words">Evidence: {reading.evidence}</p>
    {/if}
    {#if reading.reason !== null}
      <p class="text-xs text-muted-foreground break-words">Reason: {reading.reason}</p>
    {/if}
  {/if}
  <p class="text-xs text-muted-foreground break-words">{targetLabel}</p>
</Inset>
