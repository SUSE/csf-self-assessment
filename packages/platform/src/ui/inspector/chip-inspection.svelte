<script lang="ts">
  import type { InstrumentInspection, InstrumentSection } from '../instrument-wheel';
  import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
  import ObjectiveGroups from './objective-groups.svelte';
  import type { ObjectiveGroupView } from './question-blocks';

  // ONE Inspector view (ui/inspector): a wheel chip read as the questions that fan
  // onto it, grouped by objective (SOV). Registered for the `instrument-chip`
  // subject by both apps — the author passes `onManage` so the chip deep-links to
  // the section that owns it, the facilitator omits it and gets the read-only face.
  // It counts NOTHING itself (the InstrumentInspection is computed by the pure
  // inspectChip in the app shell, which is also what resolves a chip the workbook
  // no longer has). this is presentation only. Each question row deep-links, so
  // inspecting never traps you away from managing.
  type Props = {
    /** The computed inspection, or null when nothing is selected yet.*/
    inspection: InstrumentInspection | null;
    /** Deep-link a question into its editor (jumps the stage).*/
    onInspectQuestion?: ((id: string) => void) | undefined;
    /** Jump to the section that owns this chip (Dimensions / Party types / …).*/
    onManage?: ((section: InstrumentSection) => void) | undefined;
  };
  let { inspection, onInspectQuestion, onManage }: Props = $props();

  // The chip's own inspection already groups by objective. adapt it to the shared shape.
  const groups = $derived<ObjectiveGroupView[]>(
    (inspection?.groups ?? []).map((group) => ({
      objectiveId: group.objectiveId,
      objectiveName: group.objectiveName,
      blocks: group.questions.map((q) => ({
        questionId: q.id,
        text: q.text,
        chips: [q.roleName],
        units: [],
      })),
    })),
  );

  const SECTION_LABEL: Record<InstrumentSection, string> = {
    objectives: 'Objectives',
    dimensions: 'Dimensions',
    parties: 'Party types',
    roles: 'Roles',
    testEstates: 'Test estates',
  };
</script>

<div class="flex h-full min-h-0 flex-col text-sm">
  {#if inspection === null}
    <p class="p-1 text-xs text-muted-foreground">
      Click a spoke on the instrument to inspect its questions, grouped by objective.
    </p>
  {:else}
    <!-- Header: what's selected and how many questions ride it. -->
    <div class="shrink-0 border-b border-border pb-2">
      <div class="flex items-baseline justify-between gap-2">
        <h3 class="truncate font-semibold text-foreground" title={inspection.name}>{inspection.name}</h3>
        <span class="shrink-0 rounded bg-accent px-1.5 py-0.5 text-xs text-muted-foreground">
          {inspection.total} question{inspection.total === 1 ? '' : 's'}
        </span>
      </div>
      <p class="text-xs text-muted-foreground">{inspection.kindLabel}</p>
    </div>

    <div class="min-h-0 flex-1 space-y-6 overflow-y-auto overflow-x-hidden pt-3">
      <ObjectiveGroups
        groups={groups}
        onOpen={onInspectQuestion}
        empty={`No question reaches ${inspection.name} yet — a gap to close.`} />
    </div>

    {#if onManage}
      <div class="shrink-0 border-t border-border pt-2">
        <button
          type="button"
          class="flex items-center gap-1 text-xs text-link hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          onclick={() => onManage?.(inspection.section)}
        >
          Manage in {SECTION_LABEL[inspection.section]}
          <ArrowUpRight class="size-3.5" />
        </button>
      </div>
    {/if}
  {/if}
</div>
