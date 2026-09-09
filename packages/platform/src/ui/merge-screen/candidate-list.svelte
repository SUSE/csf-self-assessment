<script lang="ts">
  import type { CandidateReading } from '../../merge';
  import { Inset } from '../panel';

  // Who stood behind what, and the claim that gave them standing (landing-history
  // §4.6) — a disclosure, because the decision above already says what happened. A
  // native <details> so it needs no state and stays keyboard-reachable.
  type Props = { candidates: CandidateReading[]; open: boolean };
  let { candidates, open }: Props = $props();
</script>

<!-- An Inset (ui/panel) with its own padding: a disclosure inside the answer
     card, where a fourth hairline would only add another ring. -->
<Inset as="details" density="none" data-candidates {open}>
  <summary class="cursor-pointer px-3 py-2 text-xs text-muted-foreground">
    Candidates and claims ({candidates.length})
  </summary>
  <ul class="space-y-1 px-3 pb-2">
    {#each candidates as candidate, i (i)}
      <li class="text-xs text-muted-foreground break-words" data-candidate={candidate.from}>
        <span class="text-foreground">{candidate.from} said {candidate.answer}</span>
        · {candidate.claim} · {candidate.authorityLabel}
        {#if candidate.evidence !== null}
          · Evidence: {candidate.evidence}
        {/if}
        · {candidate.placement === 'group' ? 'placed as a group' : 'placed individually'}
        {#if candidate.standing}
          · became the standing answer
        {/if}
      </li>
    {/each}
  </ul>
</Inset>
