<script lang="ts">
  import type { AppendixRow } from '../../report';
  import { sealInkClass } from '../../utils/seal-color';

  type Props = { row: AppendixRow };

  let { row }: Props = $props();
</script>

<tr data-appendix-unit data-state={row.state}>
  <td class="py-1 pr-3">{row.targetLabel}</td>
  <td
    data-appendix-answer
    data-seal={row.seal ?? undefined}
    class={`py-1 pr-3 ${row.seal === null ? 'text-muted-foreground' : sealInkClass(row.seal)}`}>
    {row.label}
  </td>
  <td data-appendix-gesture class="py-1 pr-3">{row.placement ?? ''}</td>
  <td data-appendix-note class="py-1">{row.evidence ?? row.reason ?? ''}</td>
</tr>
