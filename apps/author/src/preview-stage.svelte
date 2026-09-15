<script lang="ts">
  import type { Answer, Party, WalkSection, Workbook } from '@csf/platform';
  import { FillSurface } from '@csf/platform/ui/fill-surface';

  // No front sheet: the author is here to try their questions, so the fill
  // surface leads with no scroll.
  type Props = {
    workbook: Workbook;
    parties: Party[];
    answers: Answer[];
    sections: WalkSection[];
    focusId: string | null;
    onChange: (answers: Answer[]) => void;
    onFocus: (id: string) => void;
  };
  let { workbook, parties, answers, sections, focusId, onChange, onFocus }: Props = $props();
</script>

<p class="text-xs text-muted-foreground">
  Previewing as a participant ({workbook.dimensions.length} dimension{workbook.dimensions.length === 1
    ? ''
    : 's'} in scope). Answers here are scratch — they are never saved.
</p>
<FillSurface {workbook} {parties} {answers} {sections} {focusId} {onChange} {onFocus} />
