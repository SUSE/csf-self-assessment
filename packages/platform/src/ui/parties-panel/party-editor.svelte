<script lang="ts">
  import type { Party, Workbook } from '../../schema';
  import { nextAddedPartyId } from '../../assessment';
  import { Button, buttonVariants } from '../button';
  import { Panel } from '../panel';
  import { Input, Select } from '../forms';
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import Check from '@lucide/svelte/icons/check';

  // The party editor (delivery §2.6.5, ADR-0007) — the twin of the claim editor:
  // name a provider you rely on, pick its third-party TYPE, and mark the dimensions
  // it serves. Reached from the party list's "+ Party" (new) or a row's edit (CRUD
  // update, pre-filled from `initial`); a Back link returns to the list. Owns only
  // the in-progress draft; emits a whole Party on Save. A NEW party's id is minted
  // from the participant name; an EDITED party keeps its id so the claim log still
  // points at it.
  type Props = {
    workbook: Workbook;
    /** Seeded + added — the id-uniqueness set a new party's id must avoid. */
    parties: Party[];
    /** Namespaces a new provider's id. */
    participantName: string;
    /** The party being edited; absent when composing a new one. */
    initial?: Party | undefined;
    onSave: (party: Party) => void;
    onBack: () => void;
  };
  let { workbook, parties, participantName, initial, onSave, onBack }: Props = $props();

  const thirdParties = $derived(workbook.parties.filter((p) => p.kind === 'third-party'));

  const initialDraft = () => ({
    name: initial?.name ?? '',
    type: initial?.type ?? thirdParties[0]?.id ?? '',
    serves: [...(initial?.serves ?? [])],
  });
  const draftAtOpen = initialDraft();
  let name = $state(draftAtOpen.name);
  let draftType = $state(draftAtOpen.type);
  let checkedDims = $state<string[]>(draftAtOpen.serves);

  const canSave = $derived(name.trim().length > 0 && thirdParties.length > 0);

  function toggleDim(dim: string): void {
    checkedDims = checkedDims.includes(dim)
      ? checkedDims.filter((d) => d !== dim)
      : [...checkedDims, dim];
  }
  function save(): void {
    if (!canSave) return;
    onSave({
      id: initial?.id ?? nextAddedPartyId(parties, participantName),
      name: name.trim(),
      type: draftType,
      serves: [...checkedDims],
    });
  }
</script>

<!-- One toggle chip — the same selection idiom the claim editor uses for its
     dimensions, so the two editors read as one family. -->
{#snippet chip(label: string, selected: boolean, toggle: () => void)}
  <button
    type="button"
    aria-pressed={selected}
    onclick={toggle}
    class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring {selected
      ? 'border-primary/50 bg-primary/10 font-medium text-foreground'
      : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'}"
  >
    {#if selected}<Check class="size-3.5 text-primary" />{/if}
    {label}
  </button>
{/snippet}

<div class="space-y-5">
  <button
    type="button"
    class="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
    onclick={onBack}
  >
    <ChevronLeft class="size-4" /> Parties
  </button>

  <Panel as="div" density="lg" class="space-y-6">
    <div class="space-y-1">
      <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {initial ? 'Edit party' : 'New party'}
      </p>
      <p class="text-sm text-muted-foreground">
        A provider you rely on. Name it, pick its type, and mark the dimensions it
        serves — then claim it under Claims.
      </p>
    </div>

    {#if thirdParties.length === 0}
      <p class="text-sm text-muted-foreground">
        This workbook defines no third-party types; no providers can be added.
      </p>
    {:else}
      <!-- Name & type — the required identity. -->
      <fieldset class="space-y-2">
        <legend class="text-sm font-medium text-foreground">Name &amp; type</legend>
        <div class="flex flex-wrap items-center gap-2">
          <Input
            class="h-9 flex-1"
            bind:value={name}
            placeholder="Party name"
            aria-label="Party name"
          />
          <Select
            class="h-9 w-auto"
            value={draftType}
            onchange={(e) => (draftType = e.currentTarget.value)}
            aria-label="Party type"
          >
            {#each thirdParties as pt (pt.id)}
              <option value={pt.id}>{pt.name}</option>
            {/each}
          </Select>
        </div>
      </fieldset>

      {#if workbook.dimensions.length > 0}
        <!-- Dimensions it serves — optional. -->
        <fieldset class="space-y-1.5">
          <legend class="text-sm font-medium text-foreground">Dimensions it serves</legend>
          <p class="text-xs text-muted-foreground">Optional — mark what this provider serves.</p>
          <div class="flex flex-wrap gap-2">
            {#each workbook.dimensions as d (d.id)}
              {@render chip(d.name || d.id, checkedDims.includes(d.id), () => toggleDim(d.id))}
            {/each}
          </div>
        </fieldset>
      {/if}

      <div class="flex items-center gap-3 border-t border-border pt-4">
        <Button onclick={save} disabled={!canSave}>{initial ? 'Save party' : 'Add party'}</Button>
        <button type="button" class={buttonVariants({ variant: 'ghost', size: 'sm' })} onclick={onBack}>
          Cancel
        </button>
        {#if !canSave}
          <span class="text-xs text-muted-foreground">Enter a name.</span>
        {/if}
      </div>
    {/if}
  </Panel>
</div>
