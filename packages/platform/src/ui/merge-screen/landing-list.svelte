<script lang="ts">
  import { untrack } from 'svelte';
  import type { HistoryGroup, Viewer } from '../../merge';
  import { Panel } from '../panel';
  import LandingRow from './landing-row.svelte';

  // The date-grouped chronology and the scroll region that remembers where the
  // facilitator was (landing-history §2.5, §3.3.2). The groups arrive computed —
  // this component decides nothing about order or membership.
  type Props = {
    groups: HistoryGroup[];
    viewer: Viewer;
    scroll: number;
    onOpen: (id: string, scroll: number) => void;
  };
  let { groups, viewer, scroll, onOpen }: Props = $props();

  let listEl: HTMLElement | undefined;

  // Reading `scroll` reactively would make a later capture fight the
  // facilitator's own scrolling.
  $effect(() => {
    const el = listEl;
    if (el === undefined) return;
    el.scrollTop = untrack(() => scroll);
  });
</script>

<div class="max-h-[60vh] overflow-y-auto pr-1" data-landing-list bind:this={listEl}>
  {#if groups.length === 0}
    <Panel as="div" class="space-y-2" data-history-nomatch>
      <p class="text-sm font-medium text-foreground">No landings match these filters</p>
      <p class="text-sm text-muted-foreground">
        Clear filters or search for another participant, question, party, or Landing ID.
      </p>
    </Panel>
  {:else}
    {#each groups as group (group.date + group.landings[0].id)}
      <section class="space-y-2 pb-3" data-landing-group data-landing-date={group.date}>
        <h4 class="text-sm font-medium text-foreground" data-landing-group-heading>
          {group.heading}
        </h4>
        <ul class="space-y-2 md:ml-1 md:border-l md:border-border md:pl-4">
          {#each group.landings as landing (landing.id)}
            <LandingRow
              {landing}
              {viewer}
              onOpen={() => onOpen(landing.id, listEl?.scrollTop ?? 0)}
            />
          {/each}
        </ul>
      </section>
    {/each}
  {/if}
</div>
