<script lang="ts">
  import { Inset } from '../panel';
  import { SealBadge } from '../seal-badge';
  import PartyKindBadge from '../workbook-facts/party-kind-badge.svelte';
  import type { PartyCoverage } from './model';

  // One declared party a party-axis question is answered for: its selected seal
  // (when an assessment is loaded), its name, and its kind — assessed party or
  // third party — named in the shared vocabulary (PartyKindBadge), never a
  // hand-written pill. `showSeal` is false for a bare workbook.
  type Props = { party: PartyCoverage; showSeal: boolean };
  let { party, showSeal }: Props = $props();
</script>

<Inset
  as="li"
  density="none"
  class="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md px-2 py-1.5"
>
  {#if showSeal}<SealBadge seal={party.seal} />{/if}
  <span class="min-w-0 flex-1 truncate text-xs text-foreground">{party.name}</span>
  <PartyKindBadge kind={party.kind} />
</Inset>
