<script lang="ts">
  import type { Answer, Party, Workbook } from '../../schema';
  import { InstrumentWheel } from '../instrument-wheel';
  import { Panel, PanelHeader } from '../panel';
  import WorkbookMetaFacts from './workbook-meta-facts.svelte';

  // What a workbook IS, at a glance: its identity strip over the instrument wheel.
  // Both the spokes and the readings report themselves to the inspection session,
  // so this passes no navigation handler.
  type Props = {
    workbook: Workbook;
    /** Concrete declared parties, when an assessment is loaded (party-axis seals).*/
    parties?: Party[];
    /** The loaded assessment's answers — the wheel's results overlay.*/
    answers?: Answer[];
  };
  let { workbook, parties = [], answers = [] }: Props = $props();
</script>

<div class="space-y-6">
  <WorkbookMetaFacts meta={workbook.meta} />

  <Panel class="space-y-3">
    <PanelHeader title="Instrument at a glance" tone="eyebrow" level={2} />
    <InstrumentWheel {workbook} {parties} {answers} />
  </Panel>
</div>
