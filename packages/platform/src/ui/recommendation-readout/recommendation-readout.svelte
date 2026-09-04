<script lang="ts">
  import type { RecommendationReadout } from '../../author';
  import { Button } from '../button';
  import { Panel, PanelHeader } from '../panel';
  import EstateCell from './estate-cell.svelte';

  // The dead-ad gauge on the Author overview (recommendations ): every
  // authored offer run against every test estate, so an offer no profile in this
  // workbook would ever hear is visible. Presentation only — every value comes off
  // the prop, nothing is computed here.
  type Props = {
    readout: RecommendationReadout;
    /** Jump to the Recommendations section — where a dead ad is widened.*/
    onOpen: () => void;
  };
  let { readout, onOpen }: Props = $props();

  // The panel's conclusion, in words. It rides the intro line rather than sitting
  // under the estate tally, because it is the ANSWER to what the intro says the
  // readout is for — a reader should not have to pass the detail to reach the
  // verdict. Phrased so it stays grammatical for a one-offer catalogue.
  const dead = $derived(readout.kind === 'readout' ? readout.neverFires.length : 0);
  const verdict = $derived.by(() => {
    if (readout.kind !== 'readout') return null;
    if (dead === 0) return 'Every offer fires on at least one test estate.';
    const total = readout.catalogue.length;
    return dead === 1
      ? `One offer of ${total} fires on no test estate.`
      : `${dead} offers of ${total} fire on no test estate.`;
  });
</script>

{#if readout.kind !== 'none-authored'}
  <Panel data-recommendation-readout class="space-y-4">
    <PanelHeader title="Recommendation readout" tone="eyebrow" level={2}>
      {#snippet actions()}
        <!-- Only a dead offer gives this button something to do. widening one is an
     edit on the Recommendations page. It rides the header's own actions row
     rather than trailing the list, which is where the panel's controls live
     everywhere else. -->
        {#if dead > 0}
          <Button variant="outline" size="sm" onclick={onOpen}>Open Recommendations</Button>
        {/if}
      {/snippet}
    </PanelHeader>

    <!-- Intro and verdict on ONE line, and deliberately uncapped: both are short
     sentences, so a prose measure never applies and only forced a break the
     width did not call for. -->
    <div class="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-xs">
      <p class="text-muted-foreground">
        Every authored offer, run against every test estate — to catch one no estate would ever
        hear. Informational: a recommendation moves no number.
      </p>
      {#if verdict}
        <p class="text-foreground">{verdict}</p>
      {/if}
    </div>

    {#if readout.kind === 'no-estates'}
      <p class="text-sm text-muted-foreground">{readout.reason}</p>
    {:else}
      <!-- A wrapping row of estate cells: as many abreast as the panel's width
     allows, sized by `basis` rather than by a column count, so the collapsing
     right rail reflows it without a breakpoint. -->
      <ul class="flex flex-wrap gap-x-10 gap-y-2.5">
        {#each readout.perEstate as estate (estate.estateId)}
          <EstateCell
            estateId={estate.estateId}
            name={estate.name}
            fired={estate.fired.length}
            catalogue={readout.catalogue.length}
          />
        {/each}
      </ul>
      {#if dead > 0}
        <!-- WHICH offers went unheard — the verdict above already said how many, so
     this is the list, named and set on one wrapping row rather than stacked
     one per line down a 1500px panel. -->
        <div class="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-t border-border pt-4">
          <h3 class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Heard by no estate
          </h3>
          <ul class="flex min-w-0 flex-wrap gap-x-6 gap-y-1">
            {#each readout.neverFires as offer (offer.id)}
              <li class="text-sm text-foreground">{offer.title}</li>
            {/each}
          </ul>
        </div>
      {/if}
    {/if}
  </Panel>
{/if}
