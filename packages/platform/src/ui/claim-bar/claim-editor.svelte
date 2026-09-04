<script lang="ts">
  import type { Claim, Party, Workbook } from '../../schema';
  import { Button, buttonVariants } from '../button';
  import { Panel } from '../panel';
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import SelectionChip from './selection-chip.svelte';

  // The claim editor: pick the role(s) you answer as, then narrow
  // the subject to dimensions and/or parties (both empty = everything for those
  // roles). Reached from the claim list's "+ Claim" (new) or a row's edit (CRUD
  // update, pre-filled from `initial`). a Back link returns to the list. Owns only
  // the in-progress selection. emits a whole Claim on Save. A live claim sentence
  // reads the selection back as scope so the participant sees the commitment before
  // saving — role is the required perspective, subject the optional narrowing.
  type Props = {
    workbook: Workbook;
    parties: Party[];
    /** The claim being edited. absent when composing a new one.*/
    initial?: Claim | undefined;
    onSave: (claim: Claim) => void;
    onBack: () => void;
  };
  let { workbook, parties, initial, onSave, onBack }: Props = $props();

  const fromIds = (ids: string[]): Record<string, boolean> =>
    Object.fromEntries(ids.map((id) => [id, true]));

  const initialSelection = () => ({
    roles: fromIds(initial?.roles ?? []),
    dimensions: fromIds(initial?.dimensions ?? []),
    parties: fromIds(initial?.parties ?? []),
  });
  const selectedAtOpen = initialSelection();
  let checkedRoles = $state<Record<string, boolean>>(selectedAtOpen.roles);
  let checkedDims = $state<Record<string, boolean>>(selectedAtOpen.dimensions);
  let checkedParties = $state<Record<string, boolean>>(selectedAtOpen.parties);

  const selectedRoles = $derived(workbook.roles.filter((r) => checkedRoles[r.id]));
  const selectedDims = $derived(workbook.dimensions.filter((d) => checkedDims[d.id]));
  const selectedParties = $derived(parties.filter((p) => checkedParties[p.id]));
  // The subject clause of the claim sentence: dimensions then named parties, by
  // display name. Empty → "the whole estate".
  const subjectNames = $derived([
    ...selectedDims.map((d) => d.name || d.id),
    ...selectedParties.map((p) => p.name || p.id),
  ]);
  const canSave = $derived(selectedRoles.length > 0);

  function save(): void {
    if (!canSave) return;
    onSave({
      roles: selectedRoles.map((r) => r.id),
      dimensions: selectedDims.map((d) => d.id),
      parties: selectedParties.map((p) => p.id),
    });
  }
</script>

<div class="space-y-5">
  <button
    type="button"
    class="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
    onclick={onBack}
  >
    <ChevronLeft class="size-4" /> Claims
  </button>

  <Panel as="div" density="lg" class="space-y-6">
    <!-- Header: eyebrow + the live claim sentence, framed as a statement. -->
    <div class="space-y-2">
      <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {initial ? 'Edit claim' : 'New claim'}
      </p>
      <p class="border-l-2 border-primary/60 pl-3 text-base leading-relaxed">
        {#if selectedRoles.length === 0}
          <span class="text-muted-foreground">Pick the role you answer as — your claim reads back here.</span>
        {:else}
          <!-- The whitespace mustaches are load-bearing single-space separators between adjacent inline spans and blocks. plain whitespace here would be collapsed/trimmed by Svelte. -->
          <!-- eslint-disable-next-line svelte/no-useless-mustaches -->
<span class="text-muted-foreground">Answering as</span>{' '}{#each selectedRoles as r, i (r.id)}<span class="font-semibold text-foreground">{r.name || r.id}</span>{i < selectedRoles.length - 1 ? ', ' : ''}{/each}{' '}<span class="text-muted-foreground">about</span>{' '}{#if subjectNames.length === 0}<span class="font-semibold text-foreground">the whole estate</span>{:else}{#each subjectNames as name, i (i)}<span class="font-semibold text-foreground">{name}</span>{i < subjectNames.length - 1 ? ', ' : ''}{/each}{/if}
        {/if}
      </p>
    </div>

    {#if workbook.roles.length === 0}
      <p class="text-sm text-muted-foreground">This workbook defines no roles; no claims can be added.</p>
    {:else}
      <!-- Role — the required perspective you answer from. -->
      <fieldset class="space-y-2">
        <div class="flex items-baseline justify-between gap-2">
          <legend class="text-sm font-medium text-foreground">Your role</legend>
          <span class="text-xs text-muted-foreground">required</span>
        </div>
        <p class="text-xs text-muted-foreground">The perspective you answer from — pick one or more.</p>
        <div class="flex flex-wrap gap-2">
          {#each workbook.roles as r (r.id)}
            <SelectionChip
              label={r.name || r.id}
              selected={!!checkedRoles[r.id]}
              onToggle={() => (checkedRoles[r.id] = !checkedRoles[r.id])} />
          {/each}
        </div>
      </fieldset>

      <!-- Subject — the optional narrowing. Empty on both lists = everything. -->
      <fieldset class="space-y-3">
        <div>
          <legend class="text-sm font-medium text-foreground">Narrow the subject</legend>
          <p class="text-xs text-muted-foreground">Leave empty to cover everything for those roles.</p>
        </div>

        {#if workbook.dimensions.length > 0}
          <div class="space-y-1.5">
            <span class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Dimensions</span>
            <div class="flex flex-wrap gap-2">
              {#each workbook.dimensions as d (d.id)}
                <SelectionChip
                  label={d.name || d.id}
                  selected={!!checkedDims[d.id]}
                  onToggle={() => (checkedDims[d.id] = !checkedDims[d.id])} />
              {/each}
            </div>
          </div>
        {/if}

        {#if parties.length > 0}
          <div class="space-y-1.5">
            <span class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Parties</span>
            <div class="flex flex-wrap gap-2">
              {#each parties as p (p.id)}
                <SelectionChip
                  label={p.name || p.id}
                  selected={!!checkedParties[p.id]}
                  onToggle={() => (checkedParties[p.id] = !checkedParties[p.id])} />
              {/each}
            </div>
          </div>
        {/if}
      </fieldset>

      <div class="flex items-center gap-3 border-t border-border pt-4">
        <Button onclick={save} disabled={!canSave}>{initial ? 'Save claim' : 'Add claim'}</Button>
        <button type="button" class={buttonVariants({ variant: 'ghost', size: 'sm' })} onclick={onBack}>
          Cancel
        </button>
        {#if !canSave}
          <span class="text-xs text-muted-foreground">Pick at least one role.</span>
        {/if}
      </div>
    {/if}
  </Panel>
</div>
