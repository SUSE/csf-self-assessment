<script lang="ts">
  import type { Answer, Party, Question, Target, Workbook } from '../../schema';
  import type { PartyPlacement, LadderChoice, Placement } from '../../assessment';
  import {
    answerFor,
    applicableDimensionsOf,
    applicableParties,
    applyPlacement,
    clearQuestion,
    findAnswer,
    mergeStrata,
    nextGroupId,
    placeGroupParty,
    placeIndividualParty,
    questionCoverage,
    retractPlacement,
    setAnswer,
    setEvidence,
    setNaReason,
  } from '../../assessment';
  import { LadderCard } from '../ladder-card';
  import { FanoutCard, type FanoutUnit } from '../fanout-card';

  // ONE question of the filling UI: picks the right card for the question's
  // grain/axis and owns the answer TRANSITIONS (the pure fan-out/superseding
  // helpers), emitting the whole next answers array. Parents own the state;
  // the participant app (fill mode) and the Author app (Preview + the card
  // flip) reuse this, so the wiring exists once (spec §3). The two fan-out grains
  // (dimension / party) share ONE generic FanoutCard — this surface maps each
  // grain onto the card's normalised `units` and translates a placed target back
  // into the grain's placement transition.
  type Props = {
    workbook: Workbook;
    parties: Party[];
    question: Question;
    answers: Answer[];
    onChange: (answers: Answer[]) => void;
    onNext: () => void;                    // NEW — advance the walk (host-owned navigation)
  };
  let { workbook, parties, question, answers, onChange, onNext }: Props = $props();

  // Union narrowing via $derived (design rule 7) — template {#if} blocks do
  // not reliably narrow a reassignable prop.
  const partyQ = $derived(question.grain === 'party' ? question : null);
  const dimensionQ = $derived(question.grain === 'dimension' ? question : null);

  // One source of truth for "is this question complete" — every in-scope unit
  // dealt with (answered / don't-know / n-a). Drives the footer's complete
  // indicator + Next enablement, the SAME rule the pager's solid circle uses.
  const coverage = $derived(questionCoverage(workbook, parties, answers, question));

  const roleName = $derived(workbook.roles.find((r) => r.id === question.role)?.name ?? question.role);

  const assessmentTarget: Target = { kind: 'assessment' };

  // The fan-out grains, each mapped onto the generic card's normalised units.
  // Dimensions carry criticality and their strata sub-units; parties carry
  // neither. applicableParties/applicableDimensionsOf are the in-scope filters.
  const dimensionUnits = $derived<FanoutUnit[]>(
    dimensionQ === null
      ? []
      : applicableDimensionsOf(dimensionQ).map((id) => {
          const d = workbook.dimensions.find((x) => x.id === id);
          const name = d?.name ?? id;
          const strata = d?.strata ?? [];
          return {
            key: id,
            label: name,
            critical: d?.critical ?? false,
            target: { kind: 'dimension' as const, dimension: id },
            // Omit `strata` entirely when there are none (exactOptionalPropertyTypes).
            ...(strata.length > 0
              ? { strata: strata.map((s) => ({ key: `${id}:${s}`, label: `${name} · ${s}`, short: s, target: { kind: 'dimension-stratum' as const, dimension: id, stratum: s } })) }
              : {}),
          };
        }),
  );
  const partyUnits = $derived<FanoutUnit[]>(
    applicableParties(parties).map((id) => ({
      key: id,
      label: parties.find((p) => p.id === id)?.name ?? id,
      critical: false,
      target: { kind: 'party' as const, party: id },
    })),
  );

  function choose(choice: LadderChoice): void {
    const gid = nextGroupId(answers);
    onChange(setAnswer(answers, answerFor(question.id, assessmentTarget, choice, { groupId: gid, placement: 'individual' })));
  }
  function setEvidenceNote(note: string): void {
    const current = findAnswer(answers, question.id, assessmentTarget);
    if (current === undefined) return;
    onChange(setEvidence(answers, question.id, current.gesture.groupId, note));
  }
  function setReasonNote(reason: string): void {
    const current = findAnswer(answers, question.id, assessmentTarget);
    if (current === undefined || current.state !== 'na') return;
    const choice: LadderChoice = reason.trim() === '' ? { state: 'na' } : { state: 'na', reason };
    onChange(setAnswer(answers, answerFor(question.id, assessmentTarget, choice, current.gesture)));
  }
  function place(placement: Placement): void {
    if (!dimensionQ) return;
    const gid = nextGroupId(answers);
    onChange(applyPlacement(answers, dimensionQ, workbook, placement, gid));
  }
  function placeParty(placement: PartyPlacement): void {
    const gid = nextGroupId(answers);
    const next = placement.kind === 'group'
      ? placeGroupParty(answers, parties, question.id, placement.choice, gid)
      : setAnswer(answers, placeIndividualParty(question.id, placement.party, placement.choice, gid));
    onChange(next);
  }
  // Translate a placed chip's target back into its grain's placement transition —
  // the one sink the FanoutCard emits into (all placements are per-chip / individual).
  function placeUnit(target: Target, choice: LadderChoice): void {
    if (target.kind === 'party') placeParty({ kind: 'individual', party: target.party, choice });
    else if (target.kind === 'dimension') place({ kind: 'individual', dimension: target.dimension, choice });
    else if (target.kind === 'dimension-stratum') place({ kind: 'individual-stratum', dimension: target.dimension, stratum: target.stratum, choice });
  }
  function retract(target: Target): void {
    onChange(retractPlacement(answers, question.id, target));
  }
  function setGroupEvidence(groupId: string, note: string): void {
    onChange(setEvidence(answers, question.id, groupId, note));
  }
  function setGroupReason(groupId: string, reason: string): void {
    onChange(setNaReason(answers, question.id, groupId, reason));
  }
  function merge(dimension: string): void {
    onChange(mergeStrata(answers, question.id, dimension));
  }
  // Reset one question to its as-loaded (unanswered) state — drops all its answers.
  function reset(): void {
    onChange(clearQuestion(answers, question.id));
  }
  const canReset = $derived(answers.some((a) => a.questionId === question.id));
</script>

{#if partyQ}
  {#if partyQ.axis === 'party'}
    <FanoutCard
      question={partyQ}
      sealLevels={workbook.sealLevels}
      {roleName}
      units={partyUnits}
      {answers}
      {coverage}
      unitNoun={{ one: 'provider', many: 'providers' }}
      grainLabel="party grain — one answer per provider"
      onPlace={placeUnit}
      onRetract={retract}
      onEvidence={setGroupEvidence}
      onReason={setGroupReason}
      {onNext}
      onReset={reset}
      {canReset}
    />
  {:else}
    <LadderCard
      question={partyQ}
      sealLevels={workbook.sealLevels}
      roles={workbook.roles}
      answer={findAnswer(answers, question.id, assessmentTarget)}
      {coverage}
      onChoose={choose}
      onEvidence={setEvidenceNote}
      onNext={onNext}
      onReason={setReasonNote}
      onReset={reset}
      {canReset}
    />
  {/if}
{:else if dimensionQ}
  <FanoutCard
    question={dimensionQ}
    sealLevels={workbook.sealLevels}
    {roleName}
    units={dimensionUnits}
    {answers}
    {coverage}
    unitNoun={{ one: 'dimension', many: 'dimensions' }}
    grainLabel="dimension grain — one answer per dimension"
    onPlace={placeUnit}
    onRetract={retract}
    onMerge={merge}
    onEvidence={setGroupEvidence}
    onReason={setGroupReason}
    {onNext}
    onReset={reset}
    {canReset}
  />
{/if}
