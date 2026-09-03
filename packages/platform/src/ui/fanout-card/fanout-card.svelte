<script lang="ts">
  import type { Answer, Question, SealLevel, Target } from '../../schema';
  import type { LadderChoice, QuestionCoverage } from '../../assessment';
  import type { Chip, FanoutUnit, UnitNoun } from './types';
  import ChipBin from './chip-bin.svelte';
  import {
    chipsFor,
    evidenceIn,
    lastAnsweredGroup,
    lastNaGroup,
    renderGroups,
    resolvedCount,
    restingOff,
    restingOnRung,
    trayCopy,
    unplaced,
  } from './model';
  import { rungAtPosition } from '../../assessment';
  import { sealName } from '../../score-engine';
  import { Ladder } from '../ladder';
  import { OffLadder, type OffKind } from '../off-ladder';
  import { UnitTray } from '../unit-tray';
  import { CommitStrip } from '../commit-strip';
  import { AnswerColumns } from '../answer-columns';
  import { QuestionHeader } from '../question-header';
  import { Panel } from '../panel';
  import { TextField } from '../forms';
  import { handleCardKeydown } from '../card-keys';
  import { createDnd, DndGhost } from '../dnd';

  // The ONE drag-first fan-out answering card (spec §4.8, ADR-0009) — grain
  // agnostic. Both axes flow through it: the caller passes a NORMALISED `units`
  // list (each unit carries its resting Target and, when splittable, its strata)
  // plus the noun/grain label and the domain callbacks. Every unit starts as a
  // chip in a dashed TRAY; every placement is PER-CHIP — drag a chip onto a rung,
  // onto an off-ladder row (Nobody knows / Doesn't apply), or back on the tray to
  // unplace; the a11y/touch fallback is tap-a-chip-then-a-target or focus-a-chip +
  // digit / N / U. There is NO bulk "place all" gesture (ADR-0009). The ⋯ on a
  // splittable chip peels a unit into its strata chips. The card computes NO
  // scoring truth: it emits per-chip placements (target + choice), retractions,
  // and merges the caller translates.

  type Props = {
    question: Question;
    sealLevels: SealLevel[];
    roleName: string;
    units: FanoutUnit[];
    answers: Answer[];
    coverage: QuestionCoverage;
    /** The unit noun for the tray count, e.g. { one: 'dimension', many: 'dimensions' }. */
    unitNoun: UnitNoun;
    grainLabel: string;
    onPlace: (target: Target, choice: LadderChoice) => void;
    onRetract: (target: Target) => void;
    /** Only ever invoked for splittable units (dimension strata); parties omit it. */
    onMerge?: (unitKey: string) => void;
    onEvidence: (groupId: string, note: string) => void;
    onReason: (groupId: string, reason: string) => void;
    onNext: () => void;
    onReset: () => void;
    canReset: boolean;
  };

  let {
    question,
    sealLevels,
    roleName,
    units,
    answers,
    coverage,
    unitNoun,
    grainLabel,
    onPlace,
    onRetract,
    onMerge,
    onEvidence,
    onReason,
    onNext,
    onReset,
    canReset,
  }: Props = $props();

  createDnd(); // one drag session for this card's chips + drop targets

  // `$state`, not a plain `let`: `bind:ref` on a component is a two-way prop
  // binding, and Svelte only propagates the assignment through reactive state.
  let cardEl = $state<HTMLElement | null>(null);

  let active = $state<string | null>(null);
  let splitIntents = $state<string[]>([]);

  const chips = $derived(chipsFor(question, units, answers, splitIntents));
  const resolved = $derived(resolvedCount(chips));
  const activeChip = $derived(chips.find((c) => c.key === active) ?? null);
  const tray = $derived(trayCopy(activeChip, unplaced(chips).length, unitNoun));
  const lastGroup = $derived(lastAnsweredGroup(question, answers));
  const lastEvidence = $derived(
    lastGroup === null ? '' : evidenceIn(question, answers, lastGroup.groupId),
  );
  const naGroup = $derived(lastNaGroup(question, answers, chips));

  function tapChip(c: Chip): void { active = active === c.key ? null : c.key; }
  function placeChip(c: Chip, choice: LadderChoice): void { onPlace(c.target, choice); active = null; }

  function dropToTray(payload: Chip): void { if (payload.answer !== undefined) onRetract(payload.target); }
  function dropOnRung(rungId: string, payload: Chip): void { placeChip(payload, { state: 'answered', rungId }); }
  function dropOffLadder(kind: OffKind, payload: Chip): void {
    placeChip(payload, kind === 'na' ? { state: 'na' } : { state: 'dont-know' });
  }
  // Split a whole dimension into its strata (the [count ⌄] control); splitting a placed
  // whole clears its answer so the strata start unplaced (nothing asserted for them).
  function splitUnit(c: Chip): void {
    splitIntents = [...splitIntents, c.unitKey];
    if (c.answer !== undefined) onRetract(c.target);
    active = null;
  }
  // Re-join a dimension's strata into one unit (the lead ⤺ on a grouped pill).
  function mergeUnit(unitKey: string): void {
    splitIntents = splitIntents.filter((k) => k !== unitKey);
    onMerge?.(unitKey);
    active = null;
  }
  // The keyboard/tap target: the focused tray chip if any, else the selected one.
  function targetChip(): Chip | null {
    const el = typeof document !== 'undefined' ? document.activeElement?.closest('[data-tray-chip]') : null;
    const key = el?.getAttribute('data-chip-key');
    if (key) return chips.find((c) => c.key === key) ?? null;
    return activeChip;
  }
</script>

<svelte:window
  onkeydown={(e) =>
    handleCardKeydown(e, cardEl, {
      place: (position) => {
        const c = targetChip();
        const r = rungAtPosition(question, position);
        if (c && r) placeChip(c, { state: 'answered', rungId: r.id });
      },
      dontKnow: () => { const c = targetChip(); if (c) placeChip(c, { state: 'dont-know' }); },
      na: () => { const c = targetChip(); if (c) placeChip(c, { state: 'na' }); },
      next: () => onNext(),
    })}
/>

<Panel as="div" bind:ref={cardEl} density="xl" class="space-y-6">
  <QuestionHeader
    {roleName}
    role={question.role}
    materiality={question.defaultMateriality}
    text={question.text}
    why={question.why}
    {coverage}
    {grainLabel}
    {onReset}
    {canReset}
  />

  <AnswerColumns>
    {#snippet scale()}
      <UnitTray title={tray.title} hint={tray.hint} onDropToTray={dropToTray}>
        <ChipBin
          groups={renderGroups(unplaced(chips), chips, units, false)}
          activeKey={active}
          onTap={tapChip}
          onSplit={splitUnit}
          onMerge={mergeUnit}
        />
      </UnitTray>

      <div class="space-y-2">
        <div class="flex items-baseline justify-between gap-2">
          <span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">The ladder</span>
          <span class="text-xs text-muted-foreground">{resolved} of {chips.length} resolved</span>
        </div>
        <Ladder
          rungs={question.ladder}
          {sealLevels}
          selected={null}
          ariaLabel={question.text}
          onSelect={(rungId) => { if (activeChip) placeChip(activeChip, { state: 'answered', rungId }); }}
          onDropRung={dropOnRung}
        >
          {#snippet rungContent(rungId)}
            <ChipBin
              groups={renderGroups(restingOnRung(chips, rungId), chips, units, true)}
              activeKey={active}
              onTap={tapChip}
              onSplit={splitUnit}
              onMerge={mergeUnit}
            />
          {/snippet}
        </Ladder>
      </div>
    {/snippet}

    {#snippet qualify()}
      <!-- The escape hatches fill the RIGHT column, top-aligned with the tray, so the
           ladder stays flush under the tray on the left and this X real estate isn't
           wasted (rather than stacking off-rows below the ladder and forcing a scroll). -->
      <OffLadder
        onOffLadder={(kind) => { if (activeChip) placeChip(activeChip, kind === 'na' ? { state: 'na' } : { state: 'dont-know' }); }}
        onDropOff={dropOffLadder}
      >
        {#snippet offLadderContent(kind)}
          <ChipBin
            groups={renderGroups(restingOff(chips, kind), chips, units, true)}
            activeKey={active}
            onTap={tapChip}
            onSplit={splitUnit}
            onMerge={mergeUnit}
          />
        {/snippet}
      </OffLadder>

      {#if lastGroup !== null}
        <CommitStrip
          seal={lastGroup.seal}
          levelName={sealName(sealLevels, lastGroup.seal)}
          evidence={lastEvidence}
          onEvidence={(note) => onEvidence(lastGroup.groupId, note)}
        />
      {/if}

      {#if naGroup !== null}
        <TextField
          label={naGroup.label ? `Why doesn’t ${naGroup.label} apply?` : 'Why doesn’t it apply?'}
          density="compact"
          value={naGroup.reason}
          oninput={(e) => onReason(naGroup.groupId, e.currentTarget.value)}
        />
      {/if}
    {/snippet}
  </AnswerColumns>

  <DndGhost />
</Panel>
