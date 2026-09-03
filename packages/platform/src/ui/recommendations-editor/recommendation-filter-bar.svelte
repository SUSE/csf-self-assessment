<script lang="ts">
  import type { RecommendationFacets, RecommendationFilter } from '../../author';
  import {
    NO_RECOMMENDATION_FILTER,
    isRecommendationFilterNarrowed,
    recommendationFilterSummary,
    recommendationOptionName,
  } from '../../author';
  import { Button } from '../button';
  import { FilterOption } from '../filter-bar';
  import { Input } from '../forms';
  import * as ToggleGroup from '../toggle-group';

  // The catalogue's narrowing controls: a search over everything a row carries
  // — including the questions attached to it — plus two labelled option strips,
  // every option showing the count it would leave, and the resulting tally.
  //
  // ONE line, not a stack of FilterRows. Two narrowings and a search over eleven
  // rows do not earn four full-width strips of chrome above the content they
  // narrow; stacked, the controls outweighed the catalogue and stretched a
  // short query across the whole stage. The labels stay — two unlabelled strips
  // that both start with "All" say nothing about what they select — but they sit
  // beside their options instead of in a fixed column, and the tally rides the
  // same line, at the right, directly over the rows it counts.
  //
  // The bar computes nothing: every label, count and sentence arrives from
  // `author/recommendation-list.ts`.
  type Props = {
    filter: RecommendationFilter;
    facets: RecommendationFacets;
    onFilter: (filter: RecommendationFilter) => void;
  };
  let { filter, facets, onFilter }: Props = $props();

  // Each chooser resolves the pressed value against the facets themselves, so an
  // option can only ever be one the core offered.
  function chooseHorizon(value: string): void {
    const option = facets.horizons.find((o) => o.value === value);
    if (option) onFilter({ ...filter, horizon: option.value });
  }
  function chooseLinkage(value: string): void {
    const option = facets.linkage.find((o) => o.value === value);
    if (option) onFilter({ ...filter, linkage: option.value });
  }
</script>

<div class="flex flex-wrap items-center gap-x-4 gap-y-2" data-recommendation-filters>
  <!-- The search field labels itself: a `type="search"` box whose placeholder
       names every field it looks in. It is sized to the query, not to the
       stage. -->
  <Input
    class="w-72 shrink-0"
    density="compact"
    type="search"
    aria-label="Search recommendations"
    placeholder="Title, action, body, or an attached question"
    value={filter.query}
    oninput={(e) => onFilter({ ...filter, query: e.currentTarget.value })}
  />

  <div class="flex items-center gap-2">
    <span class="text-xs font-medium text-muted-foreground">Horizon</span>
    <ToggleGroup.Root
      aria-label="Horizon"
      bind:value={() => filter.horizon, (v) => chooseHorizon(v)}
    >
      {#each facets.horizons as option (option.value)}
        <FilterOption
          value={option.value}
          label={option.label}
          count={option.count}
          selected={filter.horizon === option.value}
          name={recommendationOptionName(option.label, option.count)}
        />
      {/each}
    </ToggleGroup.Root>
  </div>

  <div class="flex items-center gap-2">
    <span class="text-xs font-medium text-muted-foreground">Links</span>
    <ToggleGroup.Root
      aria-label="Linkage"
      bind:value={() => filter.linkage, (v) => chooseLinkage(v)}
    >
      {#each facets.linkage as option (option.value)}
        <FilterOption
          value={option.value}
          label={option.label}
          count={option.count}
          selected={filter.linkage === option.value}
          name={recommendationOptionName(option.label, option.count)}
        />
      {/each}
    </ToggleGroup.Root>
  </div>

  <div class="ml-auto flex items-center gap-2">
    {#if isRecommendationFilterNarrowed(filter)}
      <Button
        variant="ghost"
        size="sm"
        aria-label="Clear filters"
        onclick={() => onFilter(NO_RECOMMENDATION_FILTER)}
      >
        Clear filters
      </Button>
    {/if}
    <p class="text-xs text-muted-foreground" data-recommendation-count>
      {recommendationFilterSummary(filter, facets.shown, facets.total)}
    </p>
  </div>
</div>
