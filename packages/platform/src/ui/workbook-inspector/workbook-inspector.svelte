<script lang="ts">
  import type { Answer, Party, Workbook } from '../../schema';
  import {
    DimensionTable,
    FrontSheetCard,
    ObjectiveList,
    PartyTypeTable,
    QuestionList,
    RoleTable,
    WorkbookOverview,
  } from '../workbook-facts';
  import type { FacilitatorSection } from '../facilitator-toolbar/model';
  import { getInspector } from '../inspector';

  // Read-only inspection of an imported workbook, for the facilitator (delivery
  // §4). The author EDITS this same content in ui/workbench; the facilitator only
  // READS it before setting up an estate, so this is the workbench's read-only
  // twin — no draft, no ops, no validation.
  //
  // This file is ROUTING ONLY: each section IS a component in ui/workbook-facts,
  // and all this adds is the facilitator's vocabulary — which toolbar section a
  // wheel spoke means, and which of them own a question. Estate / workflow
  // sections (parties, setup, merge) are NOT here — they are estate data the app
  // wires, not workbook facts.
  //
  // It is also the INSPECTOR-AWARE end of the Questions section: a question row
  // reports itself to the inspection session, which is what puts its detail in the
  // right rail. `QuestionList` itself stays a plain list with an `onSelect` — the
  // Author renders the same list to open the EDITOR, so the meaning of a row press
  // belongs to whoever routes it, which is here.
  type Props = {
    workbook: Workbook;
    section: FacilitatorSection;
    /** Concrete declared parties, when an assessment is loaded (party-axis seals). */
    parties?: Party[];
    /** The loaded assessment's answers — drive each question's selected SEAL rank. */
    answers?: Answer[];
  };
  let { workbook, section, parties = [], answers = [] }: Props = $props();

  const inspector = getInspector();
  // Which row reads as open: whatever the rail is showing, so the list keeps no
  // copy of the selection. A unit selected from a Landing still lights its question.
  const selectedQuestionId = $derived(
    inspector?.selection?.kind === 'question' ? inspector.selection.questionId : null,
  );
</script>

{#if section === 'overview'}
  <WorkbookOverview {workbook} {parties} {answers} />
{:else if section === 'frontsheet'}
  <FrontSheetCard lines={workbook.frontSheet} />
{:else if section === 'objectives'}
  <ObjectiveList objectives={workbook.objectives} />
{:else if section === 'dimensions'}
  <DimensionTable dimensions={workbook.dimensions} />
{:else if section === 'roles'}
  <RoleTable roles={workbook.roles} />
{:else if section === 'party-types'}
  <PartyTypeTable parties={workbook.parties} />
{:else if section === 'questions'}
  <QuestionList
    {workbook}
    {parties}
    {answers}
    onSelect={inspector
      ? (id) => inspector.show({ kind: 'question', questionId: id, target: null })
      : undefined}
    selectedId={selectedQuestionId}
  />
{/if}
