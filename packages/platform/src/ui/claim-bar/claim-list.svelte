<script lang="ts">
  import type { Answer, Claim, Party, Workbook } from '../../schema';
  import { claimCompleteness } from '../../assessment';
  import { cn } from '../../utils/cn';
  import { buttonVariants } from '../button';
  import { Chip, type ChipTone } from '../chip';
  import { Inset, Panel, PanelHeader } from '../panel';
  import Plus from '@lucide/svelte/icons/plus';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import Circle from '@lucide/svelte/icons/circle';
  import CircleDot from '@lucide/svelte/icons/circle-dot';

  // The participant's claim log as an author-style list (the twin of the Author's
  // Roles/Objectives editors): a titled card with an "+ Claim" action, a one-line
  // description, then one row per claim — its role(s), subject, answered/total,
  // and a status badge (start → in progress → complete, from claimCompleteness).
  // Each row leads with a toggle button (`activeIndex`): press it to make that
  // claim the single active one — it stays pressed in and the row is highlighted —
  // press again to deactivate. The active claim is what the Questions section
  // answers. selecting/reading a row's text does NOT change it. Adding opens the
  // claim editor.
  type Props = {
    workbook: Workbook;
    parties: Party[];
    answers: Answer[];
    claims: Claim[];
    /** The claim the Questions section answers, or -1 when none is active.*/
    activeIndex: number;
    onAdd: () => void;
    onEdit: (index: number) => void;
    /** Toggle this claim as the single active one (press again to deactivate).*/
    onToggleActive: (index: number) => void;
    onRemove: (index: number) => void;
  };
  let { workbook, parties, answers, claims, activeIndex, onAdd, onEdit, onToggleActive, onRemove }: Props = $props();

  function roleLabel(claim: Claim): string {
    return claim.roles.map((id) => workbook.roles.find((r) => r.id === id)?.name ?? id).join(', ');
  }
  function subjectLabel(claim: Claim): string {
    const dims = claim.dimensions.map((id) => workbook.dimensions.find((d) => d.id === id)?.name ?? id);
    const named = claim.parties.map((id) => parties.find((p) => p.id === id)?.name ?? id);
    const subject = [...dims, ...named];
    return subject.length === 0 ? 'everything' : subject.join(', ');
  }

  type Status = 'start' | 'in-progress' | 'complete';
  function statusOf(claim: Claim): { key: Status; label: string; answered: number; total: number } {
    const { answered, total } = claimCompleteness(workbook, parties, answers, claim);
    const key: Status =
      total === 0 || answered >= total ? 'complete' : answered === 0 ? 'start' : 'in-progress';
    const label = key === 'complete' ? 'Complete' : key === 'in-progress' ? 'In progress' : 'Not started';
    return { key, label, answered, total };
  }
  // The same three-step reading the chip vocabulary already speaks: nothing
  // started, work in flight, done.
  const BADGE: Record<Status, ChipTone> = {
    start: 'muted',
    'in-progress': 'attention',
    complete: 'positive',
  };
</script>

<Panel as="div" density="lg" class="space-y-4">
  <PanelHeader title="Claims" tone="eyebrow" level={2}>
    {#snippet actions()}
      <button class={buttonVariants({ variant: 'outline', size: 'sm' })} onclick={onAdd}>
        <Plus class="mr-1 size-4" /> Claim
      </button>
    {/snippet}
  </PanelHeader>
  <p class="text-sm text-muted-foreground">
    A claim is a slice you answer as one or more roles. Add one, then press its
    button to make it the active claim — the Questions section answers whichever
    claim is active. Press again to deactivate.
  </p>

  {#if claims.length === 0}
    <Panel as="div" tone="empty" density="none" class="px-4 py-8 text-center">
      <p class="text-sm text-muted-foreground">No claims yet.</p>
      <button
        class="{buttonVariants({ variant: 'outline', size: 'sm' })} mt-3"
        onclick={onAdd}
      >
        <Plus class="mr-1 size-4" /> Add your first claim
      </button>
    </Panel>
  {:else}
    <ul class="space-y-2">
      {#each claims as claim, i (i)}
        {@const s = statusOf(claim)}
        {@const isActive = i === activeIndex}
        <Inset as="li" density="sm" class="flex items-center gap-3 rounded-md border transition-colors {isActive ? 'border-primary bg-primary/5' : 'border-transparent'}">
          <button
            type="button"
            aria-pressed={isActive}
            aria-label={isActive ? 'Active claim — press to deactivate' : 'Set as active claim'}
            class={cn(buttonVariants({ variant: isActive ? 'default' : 'outline', size: 'icon' }), 'size-8 shrink-0')}
            onclick={() => onToggleActive(i)}
          >
            {#if isActive}
              <CircleDot class="size-4" />
            {:else}
              <Circle class="size-4" />
            {/if}
          </button>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-foreground">{roleLabel(claim)}</p>
            <p class="truncate text-xs text-muted-foreground">about {subjectLabel(claim)}</p>
          </div>
          <span class="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">{s.answered}/{s.total}</span>
          <Chip tone={BADGE[s.key]}>
            {#snippet icon()}<span class="size-1.5 rounded-full bg-current" aria-hidden="true"></span>{/snippet}
            {s.label}
          </Chip>
          <button
            type="button"
            aria-label="Edit claim"
            class="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            onclick={() => onEdit(i)}
          >
            <Pencil class="size-4" />
          </button>
          <button
            type="button"
            aria-label="Remove claim"
            class="shrink-0 text-muted-foreground transition-colors hover:text-destructive-ink"
            onclick={() => onRemove(i)}
          >
            <Trash2 class="size-4" />
          </button>
        </Inset>
      {/each}
    </ul>
  {/if}
</Panel>
