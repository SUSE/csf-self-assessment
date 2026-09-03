<script lang="ts">
  import type { TestEstate, TestEstateEvaluation, Workbook } from '@csf/platform';
  import { RecommendationsPage } from '@csf/platform/ui/recommendations-page';
  import { SegmentedNav, type SegmentedItem } from '@csf/platform/ui/segmented-nav';

  // Author QA, vendor half: the page a participant reads, over the same authored
  // test estate the dashboard is read against — so an author can see which of
  // their recommendations an estate actually fires.
  type Props = {
    workbook: Workbook;
    estates: TestEstate[];
    estate: TestEstate;
    evaluation: TestEstateEvaluation;
    onSelectEstate: (id: string) => void;
  };
  let { workbook, estates, estate, evaluation, onSelectEstate }: Props = $props();

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
  What this estate's rungs make live in the catalogue — a recommendation that fires
  on no estate is the readout's neverFires row.
</p>
<RecommendationsPage
  result={evaluation.result}
  {workbook}
  parties={evaluation.assessment.parties}
/>
