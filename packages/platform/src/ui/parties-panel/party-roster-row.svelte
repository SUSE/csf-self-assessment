<script lang="ts">
  import type { Party, Workbook } from '../../schema';
  import { Inset } from '../panel';
  // Deep import, not the barrel: going through its index would close a cycle (the
  // question-inspector precedent).
  import PartyKindBadge from '../workbook-facts/party-kind-badge.svelte';

  // One seeded party, read-only. Its kind is named by PartyKindBadge so "assessed
  // party" reads the same here as in the party-type table — the engine reads the
  // typed `kind`, and so does this.
  type Props = {
    workbook: Workbook;
    party: Party;
  };
  let { workbook, party }: Props = $props();

  const type = $derived(workbook.parties.find((t) => t.id === party.type) ?? null);
</script>

<Inset as="li" density="none" class="flex flex-wrap items-center gap-2 px-2 py-1.5">
  <span class="min-w-0 flex-1 truncate text-sm text-foreground">{party.name}</span>
  {#if type}
    <PartyKindBadge kind={type.kind} />
  {/if}
  <span class="shrink-0 text-xs text-muted-foreground">{type?.name ?? party.type}</span>
  <span class="shrink-0 text-xs text-muted-foreground">
    {party.serves.length} dimension{party.serves.length === 1 ? '' : 's'}
  </span>
</Inset>
