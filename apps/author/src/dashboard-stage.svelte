<script lang="ts">
  import type { TestEstate, TestEstateEvaluation, TileId, Workbook } from '@csf/platform';
  import { Dashboard } from '@csf/platform/ui/dashboard';
  import { SegmentedNav, type SegmentedItem } from '@csf/platform/ui/segmented-nav';

  // Author QA (analytics §3.4): the same Dashboard the participant and the
  // facilitator read, over an authored test estate.
  type Props = {
    workbook: Workbook;
    estates: TestEstate[];
    estate: TestEstate;
    evaluation: TestEstateEvaluation;
    maximised: TileId | null;
    onSelectEstate: (id: string) => void;
    onMaximise: (id: TileId | null) => void;
    onOpenQuestion: (id: string) => void;
  };
  let {
    workbook,
    estates,
    estate,
    evaluation,
    maximised,
    onSelectEstate,
    onMaximise,
    onOpenQuestion,
  }: Props = $props();

  const items = $derived<SegmentedItem[]>(
    estates.map((e) => ({
      id: e.id,
      label: e.name,
      title: e.description,
      data: { 'data-estate': e.id },
    })),
  );
</script>

<SegmentedNav label="Test estate" {items} active={estate.id} onSelect={onSelectEstate} />
<p class="text-xs text-muted-foreground">
  {estate.description} — these are the estate's authored rungs, not a
  participant's answers.
</p>
<Dashboard
  result={evaluation.result}
  {workbook}
  parties={evaluation.assessment.parties}
  {maximised}
  {onMaximise}
  {onOpenQuestion}
/>
