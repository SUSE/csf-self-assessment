<script lang="ts">
  import type { Dimension } from '../../schema';
  import { Input } from '../forms';
  import { Checkbox } from '../checkbox';
  import { ConfirmDelete } from '../confirm-delete';
  import { RecordRow } from '../record-table';

  // One dimension: its id, name, strata and the critical flag, plus the delete. It
  // holds NO edit logic — each control emits the intent and the panel applies the
  // pure op against the draft, so the row never sees a Workbook. Column widths live
  // in the table's colgroup, which is why nothing here carries a width.
  type Props = {
    dimension: Dimension;
    /** Flashed when the overview's instrument wheel deep-links to this row. */
    highlighted?: boolean;
    onUpdate: (patch: Partial<Dimension>) => void;
    onStrata: (strata: string[]) => void;
    onRemove: () => void;
  };
  let { dimension, highlighted = false, onUpdate, onStrata, onRemove }: Props = $props();

  function parseStrata(value: string): string[] {
    return value.split(',').map((s) => s.trim()).filter((s) => s !== '');
  }
</script>

<RecordRow id={dimension.id} {highlighted}>
  <td>
    <Input
      density="compact"
      class="font-mono"
      aria-label={`Dimension id ${dimension.id}`}
      data-rule="dimension"
      value={dimension.id}
      onchange={(e) => onUpdate({ id: e.currentTarget.value })}
    />
  </td>
  <td>
    <Input
      density="compact"
      aria-label={`Dimension name ${dimension.id}`}
      data-rule="dimension"
      value={dimension.name}
      oninput={(e) => onUpdate({ name: e.currentTarget.value })}
    />
  </td>
  <td>
    <Input
      density="compact"
      aria-label={`Strata for ${dimension.id}`}
      data-rule="strata"
      placeholder="service, software, hardware, chips"
      value={dimension.strata?.join(', ') ?? ''}
      onchange={(e) => onStrata(parseStrata(e.currentTarget.value))}
    />
  </td>
  <td>
    <!-- The whole cell is the target: a 16px box is a small mark, not a small
         control, so the label stretches to the column. The tick follows the palette. -->
    <label class="flex cursor-pointer justify-center py-0.5">
      <Checkbox
        aria-label={`Critical: ${dimension.id}`}
        data-rule="dimension"
        checked={dimension.critical}
        onCheckedChange={(v) => onUpdate({ critical: v })}
      />
    </label>
  </td>
  <td class="text-right">
    <ConfirmDelete label="dimension" onconfirm={onRemove} />
  </td>
</RecordRow>
