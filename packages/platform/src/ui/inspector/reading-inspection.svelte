<script lang="ts">
  import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
  import type { InstrumentSection } from '../instrument-wheel';
  import type { ReadingInspection, ReadingItem } from '../instrument-wheel';
  import ObjectiveGroups from './objective-groups.svelte';

  // ONE Inspector view (ui/inspector): a readings-ledger row read as what it
  // counted. The row says "10 dimensions, 6 critical". this names them and marks
  // the one no question reaches. It counts nothing itself — the pure
  // readingInspection in instrument-wheel does, and it is also what resolves a
  // reading the workbook no longer produces.
  type Props = {
    inspection: ReadingInspection | null;
    /** Jump to the section that owns this reading. Absent = read-only face.*/
    onManage?: ((section: InstrumentSection) => void) | undefined;
    /** Deep-link a question into its editor. Only the questions reading lists any.*/
    onOpenQuestion?: ((id: string) => void) | undefined;
  };
  let { inspection, onManage, onOpenQuestion }: Props = $props();

  const SECTION_LABEL: Record<InstrumentSection, string> = {
    objectives: 'Objectives',
    dimensions: 'Dimensions',
    parties: 'Party types',
    roles: 'Roles',
    testEstates: 'Test estates',
  };

  // Same two tones as the row itself, so an item and the row that summarised it
  // are flagged in one hue.
  const ITEM_INK: Record<NonNullable<ReadingItem['tone']>, string> = {
    advise: 'text-warning-ink',
    gap: 'text-destructive',
  };

  const section = $derived(inspection?.section);
</script>

<div class="flex h-full min-h-0 flex-col text-sm">
  {#if inspection === null}
    <p class="p-1 text-xs text-muted-foreground">
      Click a count beside the instrument to see what it counted.
    </p>
  {:else}
    <div class="shrink-0 border-b border-border pb-2">
      <div class="flex items-baseline justify-between gap-2">
        <h3 class="truncate font-semibold text-foreground">{inspection.label}</h3>
        <span class="shrink-0 rounded bg-accent px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground">
          {inspection.value}
        </span>
      </div>
      <p class="text-xs text-muted-foreground">{inspection.note}</p>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pt-3">
      <p class="pb-2 text-xs text-muted-foreground">{inspection.lead}</p>
      {#if inspection.groups.length > 0}
        <!-- A count of questions is read the way every rail reads questions. -->
        <ObjectiveGroups groups={inspection.groups} onOpen={onOpenQuestion} empty={inspection.empty} />
      {:else if inspection.items.length === 0}
        <p class="text-xs text-muted-foreground">{inspection.empty}</p>
      {:else}
        <ul class="divide-y divide-border/60 border-y border-border/60">
          {#each inspection.items as item (item.name)}
            <li class="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2">
              <span class="min-w-0 flex-1 truncate text-foreground" title={item.name}>{item.name}</span>
              <span class={`text-2xs ${item.tone ? ITEM_INK[item.tone] : 'text-muted-foreground'}`}
                >{item.note}</span>
            </li>
          {/each}
        </ul>
      {/if}
    </div>

    {#if onManage && section}
      <div class="shrink-0 border-t border-border pt-2">
        <button
          type="button"
          class="flex items-center gap-1 text-xs text-link hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          onclick={() => onManage?.(section)}
        >
          Manage in {SECTION_LABEL[section]}
          <ArrowUpRight class="size-3.5" />
        </button>
      </div>
    {/if}
  {/if}
</div>
