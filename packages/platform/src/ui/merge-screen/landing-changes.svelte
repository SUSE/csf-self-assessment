<script lang="ts">
  import type { Target } from '../../schema';
  import type { DetailGroup, RecordRef } from '../../merge';
  import { groupMountings, groupRenderings, recordRefKey, sameRecordRef } from '../../merge';
  import AnswerPanelCard from './answer-panel.svelte';
  import PartyPanelCard from './party-panel.svelte';

  // The Landing's changes, group by group (landing-history §4.5, §4.8). What is open
  // is `groupRenderings`: the default disclosure, overridden by what the facilitator
  // toggled here, and always open when it holds the anchored record. A closed group
  // renders its heading only — no panel beneath it exists yet. An open group mounts
  // its panels only once it approaches the scroll viewport (§3.4.2-§3.4.5) and holds
  // its place with a reserved placeholder until then.
  type Props = {
    groups: DetailGroup[];
    selected: RecordRef | null;
    filtered: boolean;
    /** Collapsing the group that HOLDS the anchored record drops the anchor —
     *  otherwise `holdsSelected` keeps forcing it open and the control is dead. */
    onSelect: (ref: RecordRef | null) => void;
    onOpenQuestion: (questionId: string, target: Target) => void;
  };
  let { groups, selected, filtered, onSelect, onOpenQuestion }: Props = $props();

  let toggles = $state<Record<string, boolean>>({});
  let expanded = $state<Record<string, boolean>>({});
  let mounted = $state<Record<string, boolean>>({});
  const renderings = $derived(groupRenderings(groups, selected, toggles, filtered));
  const mountings = $derived(groupMountings(renderings, mounted));

  let column: HTMLElement | undefined;

  // The observer is keyed on the group list alone. Reading the mounted set inside
  // the effect that writes it would loop forever, so this reads `renderings` and
  // never `mountings`/`mounted` (§3.4.3).
  const observedIds = $derived(renderings.map((rendering) => rendering.group.id).join(' '));

  $effect(() => {
    const ids = observedIds;
    if (column === undefined || ids === '') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = entry.target.getAttribute('data-changes-group');
          if (id === null) continue;
          mounted[id] = true;
          observer.unobserve(entry.target);
        }
      },
      { root: column, rootMargin: '600px 0px' },
    );
    for (const section of column.querySelectorAll('[data-changes-group]')) observer.observe(section);
    return () => observer.disconnect();
  });

  // Selecting a record materialises its group first (groupMountings), so the panel
  // only exists once the DOM has updated — which is why this reads the DOM in an
  // effect keyed on the selection rather than in the click handler.
  $effect(() => {
    const key = selected === null ? null : recordRefKey(selected);
    if (key === null || column === undefined) return;
    const panel = column.querySelector<HTMLElement>(`[data-record="${key}"]`);
    if (panel === null) return;
    panel.scrollIntoView({ block: 'start' });
    panel.focus({ preventScroll: true });
  });
</script>

<div data-landing-changes bind:this={column} class="max-h-[60vh] overflow-y-auto">
  {#each mountings as rendering (rendering.group.id)}
    <section class="space-y-2 py-2" data-changes-group={rendering.group.id}>
      <h4 class="flex items-center gap-2">
        <button
          class="text-xs font-medium text-foreground hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-expanded={rendering.open}
          onclick={() => {
            if (rendering.holdsSelected) onSelect(null);
            toggles[rendering.group.id] = !rendering.open;
          }}>{rendering.group.label} ({rendering.group.panels.length})</button
        >
        {#if rendering.expandAll}
          <button
            class="text-xs text-muted-foreground hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            data-expand-all
            onclick={() => {
              toggles[rendering.group.id] = true;
              expanded[rendering.group.id] = true;
            }}
          >
            Expand all
          </button>
        {/if}
      </h4>
      {#if rendering.mounted}
        {#each rendering.group.panels as panel (recordRefKey(panel.ref))}
          {#if panel.kind === 'answer'}
            <AnswerPanelCard
              {panel}
              selected={selected !== null && sameRecordRef(selected, panel.ref)}
              candidatesOpen={panel.candidatesOpen || expanded[rendering.group.id] === true}
              {onOpenQuestion}
            />
          {:else}
            <PartyPanelCard
              {panel}
              selected={selected !== null && sameRecordRef(selected, panel.ref)}
            />
          {/if}
        {/each}
      {:else if rendering.reserve > 0}
        <div data-group-placeholder style="height: {rendering.reserve}px"></div>
      {/if}
    </section>
  {/each}
</div>
