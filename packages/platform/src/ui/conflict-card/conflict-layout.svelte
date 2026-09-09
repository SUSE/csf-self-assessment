<script lang="ts">
  import Check from '@lucide/svelte/icons/check';
  import CircleDashed from '@lucide/svelte/icons/circle-dashed';
  import type { Snippet } from 'svelte';
  import type { ClashClass } from '../../schema';
  import { Chip } from '../chip';
  import { Card, Inset, eyebrowVariants } from '../panel';

  // The frame every clash card wears. It renders its own header rather than
  // QuestionHeader: a merge review is nobody's answering session, and green is
  // reserved for a good SEAL .
  
  // The Card of the queue's ramp (ui/panel): it sits up out of its objective's
  // Well, and its two candidate columns are Insets cut into it. The candidates are
  // boxed HERE rather than inside candidate-side, because the two sides must be
  // peers whatever fills them — a divergence puts two candidates side by side, a
  // grain clash puts a roll-up against a stratum silhouette, and only the layout
  // sees both.
  type Props = {
    questionId: string;
    targetLabel: string;
    clashClass: ClashClass;
    role: string;
    questionText: string;
    why: string | undefined;
    incomingName: string;
    /** Whether a resolution has been recorded. Drives the one accent on the card:
     * an undecided clash carries the amber "act here" perimeter and the lift, a
     * decided one keeps the surface and drops both.*/
    decided: boolean;
    base: Snippet;
    incoming: Snippet;
    choices: Snippet;
  };
  let { questionId, targetLabel, clashClass, role, questionText, why,
        incomingName, decided, base, incoming, choices }: Props = $props();

  // The merge surface's column eyebrow (the same one landing-checks and the party
  // queue use), so `Estate base` and `Incoming · Jane` read as the two headed
  // columns of one register rather than as two stray captions.
  const eyebrow = eyebrowVariants();
</script>

<Card
  as="section"
  state={decided ? 'settled' : 'open'}
  density="sm"
  class="space-y-3"
  aria-label={`Clash ${questionId} · ${targetLabel}`}
  data-clash-class={clashClass}
  data-clash-decided={decided}
>
  <!-- Title bar: what this clash IS, and whether it still wants you. Full width,
     because it names the row. The state chip is pushed to the right edge so a
     column of them runs down the queue and the remaining work can be counted
     without reading a single card — the word is the carrier, the colour only
     makes the column scannable. -->
  <div class="flex flex-wrap items-center gap-2 text-sm">
    <span class="font-semibold text-foreground">{questionId} · {targetLabel}</span>
    <Chip tone="neutral">{clashClass}</Chip>
    <Chip tone="mono">{role}</Chip>
    {#if decided}
      <Chip tone="muted" class="ml-auto" data-clash-state="decided">
        {#snippet icon()}<Check class="size-3 shrink-0" aria-hidden="true" />{/snippet}
        decided
      </Chip>
    {:else}
      <Chip tone="attention" class="ml-auto" data-clash-state="open">
        {#snippet icon()}<CircleDashed class="size-3 shrink-0" aria-hidden="true" />{/snippet}
        open
      </Chip>
    {/if}
  </div>

  <!-- The card is THREE beats — what is asked, what the two of them said, what
     you decide — so it is one row of three, not a stack of full-bleed bands.
     Flex, not a breakpoint grid: the width that matters is the PANEL's, and it
     changes when the right rail opens, which no `sm:`/`xl:` can see. Each beat
     carries a basis (its fold threshold) and a cap (its own right measure).
     decision folds under first, then the candidates, then the pair itself.
     Every cap is load-bearing. Prose set across 1900px is a line the eye loses
     on the way back, and candidates split across a full stage sat ~900px apart
     — the one arrangement that stops a reader comparing them.
     The pair's own basis is deliberately SHORT: whatever the panel does, the
     two candidates are the last thing allowed to fold apart, because stacked
     they stop being a comparison and become two facts. -->
  <div class="flex flex-wrap items-start gap-x-6 gap-y-3">
    <div class="min-w-0 max-w-[62ch] grow basis-[24rem] space-y-2">
      <h4 class="text-sm text-foreground">{questionText}</h4>
      {#if why}
        <p class="border-l-2 border-border pl-4 text-xs text-muted-foreground">{why}</p>
      {/if}
    </div>

    <!-- Each side is an Inset: fill, no border. The pair used to be two bordered
     boxes inside a bordered card inside a bordered group, and at that depth one
     more ring of hairline stops separating anything. The label sits INSIDE its
     inset so the recess covers the whole column and the two read as two slots
     cut into the card, not as two captions above two panels. -->
    <div class="flex min-w-0 max-w-[40rem] grow basis-[26rem] flex-wrap items-start gap-3">
      <Inset density="xs" class="min-w-0 grow basis-[12rem] space-y-1">
        <p class={eyebrow}>Estate base</p>
        {@render base()}
      </Inset>
      <Inset density="xs" class="min-w-0 grow basis-[12rem] space-y-1">
        <p class={eyebrow}>{`Incoming · ${incomingName}`}</p>
        {@render incoming()}
      </Inset>
    </div>

    <div class="min-w-0 max-w-[34rem] grow basis-[20rem]">
      {@render choices()}
    </div>
  </div>
</Card>
