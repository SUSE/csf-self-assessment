<script lang="ts">
  import type { PartyType } from '../../schema';
  import { RecordRow } from '../record-table';
  import PartyKindBadge from './party-kind-badge.svelte';

  // One party type, read-only: its code, name, kind and description. The kind is the
  // cell that carries the workbook's single-assessed-party invariant. the author's
  // twin adds the offer to move that role, which is the only difference between the
  // two rows.
  type Props = {
    party: PartyType;
  };
  let { party }: Props = $props();
</script>

<RecordRow id={party.id}>
  <td class="truncate font-mono text-muted-foreground">{party.id}</td>
  <td class="truncate text-foreground">{party.name}</td>
  <td><PartyKindBadge kind={party.kind} /></td>
  <td class="text-muted-foreground">{party.description ?? '—'}</td>
</RecordRow>
