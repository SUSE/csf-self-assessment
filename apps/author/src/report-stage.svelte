<script lang="ts">
  import type { ReportStamp, TestEstate, TestEstateEvaluation } from '@csf/platform';
  import { ReportPage } from '@csf/platform/ui/report-page';
  import { SegmentedNav, type SegmentedItem } from '@csf/platform/ui/segmented-nav';

  // Author QA, document half: the Report a participant prints, over the same
  // authored test estate the dashboard is read against — so an author can see the
  // leave-behind their instrument produces before a room ever prints one.
  type Props = {
    estates: TestEstate[];
    estate: TestEstate;
    evaluation: TestEstateEvaluation;
    stamp: ReportStamp;
    onSelectEstate: (id: string) => void;
  };
  let { estates, estate, evaluation, stamp, onSelectEstate }: Props = $props();

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
  The document this estate's authored rungs produce — these readings are the estate's,
  not a participant's.
</p>
<ReportPage assessment={evaluation.assessment} result={evaluation.result} {stamp} />
