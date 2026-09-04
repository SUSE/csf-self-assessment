<script lang="ts">
  import type { CredibilityTile } from '../../../../analytics';
  import ContributorDonut from './contributor-donut.svelte';
  import { contributorInkClass } from './contributor-paint';
  import ContributorRow from './contributor-row.svelte';
  import { contributorRows } from './contributor-rows';
  import CredibilityFact from './credibility-fact.svelte';

  // Two readings, ruled apart: WHO produced the file (a composition, drawn as a
  // dial with its legend) and HOW it was produced (two part-of-whole ratios, drawn
  // as bars). Past `@xl` they take a column each — stacked, a wide tile spent its
  // width on a void beside the dial and on 800px of empty bar track. The rule
  // between them turns with the flow: top border stacked, left border side by side.
  const LINES = 5;

  let { view }: { view: CredibilityTile } = $props();

  const rows = $derived(
    view.ledger.kind === 'landed' ? contributorRows(view.ledger.contributors, LINES) : [],
  );
</script>

<div class="flex flex-col gap-3 @xl:flex-row @xl:gap-6">
  <section data-credibility-who class="min-w-0 @xl:flex-[1]">
    {#if view.ledger.kind === 'landed'}
      <p data-credibility-ledger class="text-sm text-card-foreground">{view.ledger.line}</p>
      {#if rows.length > 0}
        <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          <ContributorDonut {rows} standing={view.ledger.standing} />
          <ul data-credibility-contributors class="flex max-w-xs min-w-36 flex-1 flex-col gap-1">
            {#each rows as row, index (row.key)}
              <ContributorRow {row} ink={contributorInkClass(index)} />
            {/each}
          </ul>
        </div>
      {/if}
    {:else}
      <p data-credibility-unlanded class="text-sm text-muted-foreground">{view.ledger.reason}</p>
    {/if}
  </section>

  <section
    data-credibility-how
    class="flex flex-col gap-2 border-t border-border pt-3 @xl:flex-[1] @xl:border-t-0 @xl:border-l @xl:pt-0 @xl:pl-6">
    {#if view.swept.kind === 'measured'}
      <CredibilityFact
        mark="swept"
        label="placed by a group gesture"
        value={`${view.swept.swept} of ${view.swept.answered} · ${view.swept.percent}`}
        fraction={view.swept.swept / view.swept.answered} />
    {:else}
      <p data-credibility-swept class="text-xs text-muted-foreground">{view.swept.reason}</p>
    {/if}
    {#if view.ledger.kind === 'landed'}
      <CredibilityFact
        mark="disputed"
        label="disputed on landing"
        value={`${view.ledger.disputed} of ${view.ledger.records}`}
        fraction={view.ledger.records === 0 ? 0 : view.ledger.disputed / view.ledger.records} />
    {/if}
  </section>
</div>

<!-- Further off than the rule above it: a footnote about the tile, not a third fact. -->
<p data-credibility-caption class="mt-4 text-xs text-muted-foreground">{view.caption}</p>
