<script lang="ts">
  import type { ZodIssue } from 'zod';
  import type { Workbook } from '../../schema';
  import type {
    EstateFloorFlip,
    RecommendationReadout,
    TestEstateReading,
  } from '../../author';
  import { authorGauges, duplicateRadar, ladderLint } from '../../author';
  import { CoverageGrid } from '../coverage-grid';
  import { EstateReadoutPanel } from '../estate-readout';
  import { GateList } from '../gate-list';
  import { IssueList } from '../forms';
  import { InstrumentWheel, type InstrumentSection } from '../instrument-wheel';
  import { Panel, PanelHeader } from '../panel';
  import { RecommendationReadoutPanel } from '../recommendation-readout';
  import { WordingChecks } from '../wording-checks';
  import WorkbookMetaPanel from './workbook-meta-panel.svelte';
  import type { FocusRef } from './focus';

  // The Author's Overview focus: what this instrument IS, read at a glance. It is
  // its own component because it grew from two panels to seven — the workbench
  // stage above it routes a focus to one editor and should stay routing only.
  
  // It is also where the retired Author HUD's readings landed. The HUD was a rail
  // tab holding seven sections, most of which had since been said better elsewhere:
  // its budget gauge is the instrument wheel's readings ledger, and its role
  // readout is the Roles page's own load column. What had no other home — the
  // coverage cross-tab, the floor gates, the live estate readings, the wording
  // checks — is on the canvas here, at full width, and every finding now OPENS the
  // thing it names instead of only citing a rule.
  
  // The raw-draft readouts are derived here (pure counts over the definition, the
  // same way InstrumentWheel derives its own model). the engine-backed ones arrive
  // as props, because only the app shell holds the strict-parsed workbook and the
  // floor-flip baseline (design rule 4).
  type Props = {
    draft: Workbook;
    issues: ZodIssue[];
    onDraft: (next: Workbook) => void;
    /** Jump the stage to another section or editor.*/
    onFocus: (focus: FocusRef) => void;
    /** A wheel spoke or a column head names a section AND a row to flash there.*/
    onNavigate: (section: InstrumentSection, id: string | null) => void;
    recommendationReadout: RecommendationReadout | null;
    /** null while the draft has strict issues.*/
    estateReadings: TestEstateReading[] | null;
    estateFlips: EstateFloorFlip[];
  };
  let {
    draft,
    issues,
    onDraft,
    onFocus,
    onNavigate,
    recommendationReadout,
    estateReadings,
    estateFlips,
  }: Props = $props();

  // Issues not owned by a section below (weights sum / unique ids / sealLevels) —
  // shown here, alongside the workbook meta.
  const bannerIssues = $derived(
    issues.filter((i) => i.path.length <= 1 || i.path[0] === 'sealLevels'),
  );

  const gauges = $derived(authorGauges(draft));
  const lint = $derived(ladderLint(draft));
  const duplicates = $derived(duplicateRadar(draft));
</script>

<IssueList issues={bannerIssues} />

<WorkbookMetaPanel {draft} {issues} {onDraft} />

<!-- Instrument at a glance: the MergeWheel grammar read structurally — where this
     workbook's questions land across dimensions and parties, beside the counts
     that don't ride a spoke. A spoke INSPECTS its chip in the right rail (stage
     stays put) by reporting itself to the inspection session, and a reading row
     does the same — this page passes no handler for either. -->
<Panel class="space-y-5">
  <PanelHeader title="Instrument at a glance" tone="eyebrow" level={2} />
  <InstrumentWheel workbook={draft} />
</Panel>

<CoverageGrid
  coverage={gauges.coverage}
  workbook={draft}
  onOpenDimension={(id) => onNavigate('dimensions', id)}
  onOpenObjective={(id) => onFocus({ kind: 'objective', id })}
/>

<GateList
  gates={gauges.gateList}
  workbook={draft}
  onOpenQuestion={(id) => onFocus({ kind: 'question', id })}
/>

<EstateReadoutPanel
  readings={estateReadings}
  flips={estateFlips}
  onOpen={() => onFocus({ kind: 'testEstates' })}
/>

{#if recommendationReadout !== null}
  <RecommendationReadoutPanel
    readout={recommendationReadout}
    onOpen={() => onFocus({ kind: 'recommendations' })}
  />
{/if}

<WordingChecks
  {lint}
  {duplicates}
  onOpenQuestion={(id) => onFocus({ kind: 'question', id })}
/>
