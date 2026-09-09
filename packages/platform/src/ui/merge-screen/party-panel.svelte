<script lang="ts">
  import type { PartyPanel } from '../../merge';
  import { recordRefKey } from '../../merge';
  import { Card, Inset, eyebrowVariants } from '../panel';

  // One party decision a Landing recorded (landing-history §4.7). A party decision
  // changes a SET, not one row: the affected parties before and the affected parties
  // after are shown as peer lists, and an absent side is LABELLED rather than left as
  // an empty box. The answer-target rewrites are listed as recorded, never inferred.
  type Props = { panel: PartyPanel; selected: boolean };
  let { panel, selected }: Props = $props();
</script>

<!-- A Card (ui/panel), a peer of the answer panels it sits among in the changes
     column. Same focus ring, for the same reason: the nav moves focus here. -->
<Card
  as="section"
  density="sm"
  class="space-y-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
  tabindex={-1}
  data-record={recordRefKey(panel.ref)}
  data-party-panel
  aria-current={selected ? 'true' : undefined}
>
  <p class="text-sm text-foreground break-words">Decision: {panel.decision}</p>
  {#if panel.rationale !== null}
    <p class="text-sm text-muted-foreground break-words">{panel.rationale}</p>
  {/if}
  {#if panel.rewrites.length > 0}
    <ul class="space-y-0.5">
      {#each panel.rewrites as rewrite, i (i)}
        <li class="text-xs text-muted-foreground" data-party-rewrite>
          {rewrite.questionId}: {rewrite.before} → {rewrite.after}
        </li>
      {/each}
    </ul>
  {/if}

  <div class="grid gap-3 md:grid-cols-2">
    {#each [{ heading: 'Before landing', empty: 'No affected party before landing', rows: panel.before }, { heading: 'After landing', empty: 'No affected party after landing', rows: panel.after }] as side (side.heading)}
      <!-- The same `bg-card`-inside-`bg-card` bug snapshot-side had: two boxes
     that were the same colour as their parent in every palette. -->
      <Inset as="article" density="sm" class="space-y-1">
        <h5 class={eyebrowVariants({ weight: 'medium' })}>
          {side.heading}
        </h5>
        {#if side.rows.length === 0}
          <p class="text-sm text-muted-foreground">{side.empty}</p>
        {:else}
          <ul class="space-y-1">
            {#each side.rows as party, i (i)}
              <li class="space-y-0.5" data-party-row={party.id}>
                <p class="text-sm text-foreground">{party.name}</p>
                <p class="font-mono text-xs text-muted-foreground">{party.id}</p>
                <p class="text-xs text-muted-foreground">{party.typeName}</p>
                <p class="text-xs text-muted-foreground">
                  {party.serves.length === 0 ? 'serves nothing yet' : `serves ${party.serves.join(', ')}`}
                </p>
              </li>
            {/each}
          </ul>
        {/if}
      </Inset>
    {/each}
  </div>
</Card>
