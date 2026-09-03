<script lang="ts">
  import type { ZodIssue } from 'zod';
  import type { Seal, Workbook } from '../../schema';
  import { issuesUnder } from '../../schema';
  import { sealName } from '../../score-engine';
  import type { RecommendationFilter } from '../../author';
  import {
    NO_RECOMMENDATION_FILTER,
    addRecommendation,
    filterRecommendationRows,
    recommendationFacets,
    recommendationRows,
    removeRecommendation,
  } from '../../author';
  import { Button } from '../button';
  import { Panel, PanelHeader, Well } from '../panel';
  import RecommenderBlock from './recommender-block.svelte';
  import RecommendationFilterBar from './recommendation-filter-bar.svelte';
  import RecommendationRowItem from './recommendation-row.svelte';
  import { IssueList } from '../forms';

  // The Workbench's Recommendations section (spec §4.5) as a LIST page: the
  // catalogue plus the attribution it may not be read without. Adding one opens
  // it — this page never edits a recommendation in place, so a catalogue of
  // twenty is still a page you can read.
  //
  // Three blocks, separated at the section step (1.5rem) and tight inside
  // themselves, so the page has a cadence rather than one repeated gap: the
  // heading and its sentence are one unit; the byline is one unit; and the
  // filter bar and the rows are ONE unit, because the bar is the catalogue's
  // own header and the tally it ends with belongs to the rows directly beneath.
  //
  // This section owns TWO issue paths (`recommender` and `recommendations`), so
  // it receives the full strict issue list and scopes it itself.
  type Props = {
    draft: Workbook;
    issues: ZodIssue[];
    onDraft: (next: Workbook) => void;
    /** Open one recommendation's editor. */
    onOpen: (recommendationId: string) => void;
  };
  let { draft, issues, onDraft, onOpen }: Props = $props();

  let filter = $state<RecommendationFilter>(NO_RECOMMENDATION_FILTER);

  const rows = $derived(recommendationRows(draft));
  const shown = $derived(filterRecommendationRows(rows, filter));
  const facets = $derived(recommendationFacets(rows, filter));

  const sectionIssues = $derived(
    issues.filter((i) => i.path[0] === 'recommendations' && i.path.length <= 1),
  );

  // A new recommendation is appended, then opened — an author who pressed "+"
  // is asking to write one, not to look at a blank row.
  function addAndOpen(): void {
    const next = addRecommendation(draft);
    const created = next.recommendations[next.recommendations.length - 1];
    onDraft(next);
    if (created) onOpen(created.id);
  }

  const levelName = (seal: Seal): string => sealName(draft.sealLevels, seal);
</script>

<Panel class="space-y-6">
  <div class="space-y-1">
    <PanelHeader title="Recommendations" tone="eyebrow" level={2}>
      {#snippet actions()}<Button variant="outline" onclick={addAndOpen}>+ Recommendation</Button>{/snippet}
    </PanelHeader>
    <p class="max-w-prose text-xs text-muted-foreground">
      Vendor content shown on the dashboard against a weakness the estate has just
      read. Nothing here moves a number. Open one to write it.
    </p>
  </div>

  <RecommenderBlock {draft} issues={issuesUnder(issues, ['recommender'])} {onDraft} />

  {#if rows.length === 0}
    <Well tone="empty" density="sm">
      <p class="text-xs text-muted-foreground">
        No recommendations yet — add one to pitch against a weakness.
      </p>
    </Well>
  {:else}
    <div class="space-y-2">
      <RecommendationFilterBar {filter} {facets} onFilter={(next) => (filter = next)} />
      {#if shown.length === 0}
        <!-- Padded rather than a bare line: a dead-end filter must not collapse
             the region the rows were occupying. -->
        <p
          class="border-y border-border/60 px-2 py-6 text-xs text-muted-foreground"
          data-recommendation-none
        >
          No recommendation matches this filter.
        </p>
      {:else}
        <ul class="divide-y divide-border/60 border-y border-border/60">
          {#each shown as row (row.recommendation.id)}
            <RecommendationRowItem
              {row}
              flagged={issuesUnder(issues, ['recommendations', row.index]).length > 0}
              sealName={levelName(row.recommendation.whenAtOrBelow)}
              onOpen={() => onOpen(row.recommendation.id)}
              onRemove={() => onDraft(removeRecommendation(draft, row.recommendation.id))}
            />
          {/each}
        </ul>
      {/if}
    </div>
  {/if}

  <IssueList issues={sectionIssues} />
</Panel>
