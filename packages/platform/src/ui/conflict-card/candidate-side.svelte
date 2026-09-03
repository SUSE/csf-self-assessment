<script lang="ts">
  import type { Authority, Question } from '../../schema';
  import type { ReviewCandidate } from '../../merge';
  import { authorityLabel } from '../../merge/authority';
  import { answerLabel } from '../../utils/answer-label';
  import { Chip, type ChipTone } from '../chip';

  // One candidate in one column: who said what, the evidence behind it, and the
  // standing the claim behind it confers.
  //
  // Content, not a container: the Inset it sits in belongs to conflict-layout,
  // which is the only thing that sees both sides and can keep them peers.
  type Props = { candidate: ReviewCandidate; question: Pick<Question, 'ladder'> };
  let { candidate, question }: Props = $props();

  // The standing this candidate had on this unit, and the ONE fact on the column
  // that differs between the two sides — "who had the right to answer here" is
  // the first question a clash asks, and the suggestion engine reasons from this
  // same field ("Jane's claim names modelhouse").
  //
  // `out-of-claim` renders NOTHING. A participant cannot produce one by
  // answering: `claimWalk` filters the walk to the active claim and narrows both
  // `appliesTo` and the party list, so a unit outside their claims is never shown
  // to them. It survives only as an integrity artefact — a claim removed or
  // narrowed after answering (delivery §2.3.4: removing a claim never deletes
  // answers), or a partial whose workbook has drifted. Landing checks already
  // reports exactly that, as a count, in the "Recorded · does not block"
  // register, which is where a file-integrity note belongs; a per-candidate chip
  // was a second rendering of it in the one place it can only ever be noise.
  const TONE: Record<Exclude<Authority, 'out-of-claim'>, ChipTone> = {
    owner: 'strong',
    blanket: 'neutral',
  };
</script>

<div class="space-y-0.5">
  <p class="text-sm font-medium text-foreground">{candidate.from} said {answerLabel(question, candidate.answer)}</p>
  {#if candidate.authority !== 'out-of-claim'}
    <Chip
      tone={TONE[candidate.authority]}
      size="sm"
      data-authority={candidate.authority}
      title={candidate.claim === null ? undefined : `Claimed as ${candidate.claim.roles.join(', ')}`}
    >
      {authorityLabel(candidate.authority)}
    </Chip>
  {/if}
  {#if candidate.answer.state === 'answered' && candidate.answer.evidence !== undefined}
    <p class="text-xs text-muted-foreground">Evidence: {candidate.answer.evidence}</p>
  {/if}
</div>
