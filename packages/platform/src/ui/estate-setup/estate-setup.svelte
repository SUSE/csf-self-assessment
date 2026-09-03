<script lang="ts">
  import type { Party, Workbook } from '../../schema';
  import { Button } from '../button';
  import { ConfirmDelete } from '../confirm-delete';
  import { Input, Select, TextField } from '../forms';
  import { Well } from '../panel';

  // Facilitator setup (delivery §4.1): name the estate (the one required field)
  // and seed the providers known beforehand — name, party TYPE (from the
  // workbook's authored taxonomy), and the dimensions each serves. No dimension /
  // critical / question decisions are offered (those are authored, ADR-0005). This
  // is a CONTROLLED surface: the app owns the working estate + parties (so the
  // facilitator's Parties section reflects the same seeded providers live), stamps
  // id/createdAt on export, and writes the workbook-assessment file. Seeded
  // providers get stable ids so every filler answers about the same node — seed
  // the initial roster with `defaultParties(workbook)` in the caller.
  type Props = {
    workbook: Workbook;
    estate: string;
    parties: Party[];
    onEstate: (estate: string) => void;
    onParties: (parties: Party[]) => void;
    onExport: (estate: string, parties: Party[]) => void;
  };
  let { workbook, estate, parties, onEstate, onParties, onExport }: Props = $props();

  const assessedTypeIds = $derived(
    new Set(workbook.parties.filter((p) => p.kind === 'assessed').map((p) => p.id)),
  );
  const thirdPartyType = $derived(workbook.parties.find((p) => p.kind === 'third-party'));
  const assessedCount = $derived(parties.filter((p) => assessedTypeIds.has(p.type)).length);
  const canExport = $derived(estate.trim().length > 0 && assessedCount === 1);

  function nextPartyId(): string {
    const taken = new Set(parties.map((p) => p.id));
    let n = 1;
    while (taken.has(`provider-${n}`)) n += 1;
    return `provider-${n}`;
  }
  function addProvider(): void {
    if (!thirdPartyType) return;
    onParties([
      ...parties,
      { id: nextPartyId(), name: 'New provider', type: thirdPartyType.id, serves: [] },
    ]);
  }
  function removeProvider(id: string): void {
    onParties(parties.filter((p) => p.id !== id));
  }
  function setName(id: string, name: string): void {
    onParties(parties.map((p) => (p.id === id ? { ...p, name } : p)));
  }
  function setType(id: string, type: string): void {
    onParties(parties.map((p) => (p.id === id ? { ...p, type } : p)));
  }
  function toggleServes(id: string, dim: string): void {
    onParties(
      parties.map((p) =>
        p.id === id
          ? { ...p, serves: p.serves.includes(dim) ? p.serves.filter((d) => d !== dim) : [...p.serves, dim] }
          : p,
      ),
    );
  }
  function exportWa(): void {
    onExport(estate.trim(), parties);
  }
</script>

<div class="mx-auto max-w-4xl space-y-6 p-6">
  <div class="space-y-1">
    <h2 class="text-lg font-semibold text-foreground">Prepare a workbook-assessment</h2>
    <p class="text-sm text-muted-foreground">
      Name the estate and seed the providers you already know. Participants open
      this file and answer immediately — no scope wizard. They can add providers
      they discover in context.
    </p>
  </div>

  <TextField
    label="Estate name"
    placeholder="e.g. Acme Department"
    bind:value={() => estate, (v) => onEstate(v)}
  />

  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-medium text-foreground">Parties</h3>
      <Button variant="outline" onclick={addProvider} disabled={!thirdPartyType}>Add party</Button>
    </div>
    {#each parties as party (party.id)}
      <Well density="sm" class="space-y-2">
        <div class="flex flex-wrap items-center gap-2">
          <Input
            class="flex-1"
            density="compact"
            value={party.name}
            oninput={(e) => setName(party.id, e.currentTarget.value)}
            aria-label={`Party name ${party.id}`}
          />
          <Select
            density="compact"
            class="w-auto"
            value={party.type}
            onchange={(e) => setType(party.id, e.currentTarget.value)}
            aria-label={`Party type ${party.id}`}
          >
            {#each workbook.parties as pt (pt.id)}
              <option value={pt.id}>{pt.name}</option>
            {/each}
          </Select>
          <ConfirmDelete label="party" onconfirm={() => removeProvider(party.id)} />
        </div>
        <div class="flex flex-wrap gap-1">
          {#each workbook.dimensions as d (d.id)}
            <button
              type="button"
              aria-pressed={party.serves.includes(d.id)}
              class="rounded-full border px-2 py-0.5 text-xs {party.serves.includes(d.id)
                ? 'border-foreground bg-accent font-medium text-foreground'
                : 'border-border text-muted-foreground/60'}"
              onclick={() => toggleServes(party.id, d.id)}
            >{d.name}</button>
          {/each}
        </div>
      </Well>
    {/each}
    {#if assessedCount !== 1}
      <p class="text-xs text-destructive-ink">
        Exactly one provider must be the assessed party (kind “assessed”); there
        {assessedCount === 0 ? 'are none' : `are ${assessedCount}`}.
      </p>
    {/if}
  </div>

  <Button onclick={exportWa} disabled={!canExport}>Export workbook-assessment</Button>
</div>
