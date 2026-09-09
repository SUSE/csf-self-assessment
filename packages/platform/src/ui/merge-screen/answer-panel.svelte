<script lang="ts">
  import type { Target } from '../../schema';
  import type { AnswerPanel } from '../../merge';
  import { recordRefKey } from '../../merge';
  import { Button } from '../button';
  import { Card } from '../panel';
  import CandidateList from './candidate-list.svelte';
  import SnapshotSide from './snapshot-side.svelte';

  // One answer unit a Landing touched, read as its semantic before and after
  // (landing-history §4.6): who the unit is, what stood, what stands, and the human
  // action between. Every value arrives on the panel — nothing is computed here.
  type Props = {
    panel: AnswerPanel;
    selected: boolean;
    candidatesOpen: boolean;
    onOpenQuestion: (questionId: string, target: Target) => void;
  };
  let { panel, selected, candidatesOpen, onOpenQuestion }: Props = $props();
</script>

<!-- A Card (ui/panel): one affected record, read and acted on. The focus ring
     rides on `class` — the nav below it moves focus here, so the ring is how a
     keyboard reader knows which panel the arrow keys landed on. -->
<Card
  as="section"
  density="sm"
  class="space-y-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
  tabindex={-1}
  data-record={recordRefKey(panel.ref)}
  data-effect={panel.effect}
  aria-current={selected ? 'true' : undefined}
>
  <p class="text-xs text-muted-foreground">{panel.objectiveName} · {panel.objectiveId}</p>
  <p class="text-sm font-medium text-foreground">{panel.questionId}</p>
  {#if panel.questionText !== ''}
    <p class="text-sm text-foreground break-words">{panel.questionText}</p>
  {/if}
  <p class="text-xs text-muted-foreground">
    {panel.targetLabel} · {panel.effect} · {panel.process}{panel.clash === null
      ? ''
      : ` · ${panel.clash}`}
  </p>

  <div class="grid min-w-0 gap-3 md:grid-cols-2">
    <SnapshotSide heading="Before landing" reading={panel.before} targetLabel={panel.targetLabel} />
    <SnapshotSide heading="After landing" reading={panel.after} targetLabel={panel.targetLabel} />
  </div>

  <p class="text-sm text-foreground break-words">Decision: {panel.decision}</p>
  {#if panel.rationale !== null}
    <p class="text-sm text-muted-foreground break-words">{panel.rationale}</p>
  {/if}

  <CandidateList candidates={panel.candidates} open={candidatesOpen} />

  {#if panel.ref.kind === 'answer'}
    {@const target = panel.ref.target}
    <Button
      variant="outline"
      size="xs"
      data-open-question
      aria-label="Open question"
      onclick={() => onOpenQuestion(panel.questionId, target)}
    >
      Open question
    </Button>
  {/if}
</Card>
