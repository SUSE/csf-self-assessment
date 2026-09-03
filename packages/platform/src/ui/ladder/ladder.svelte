<script lang="ts" generics="P extends DragPayload">
  import type { Snippet } from 'svelte';
  import type { Rung, SealLevel } from '../../schema';
  import { rungAtPosition } from '../../assessment';
  import { sealName } from '../../score-engine';
  import type { DragPayload } from '../dnd';
  import LadderRung from './ladder-rung.svelte';

  // The rung column. The two OFF-LADDER answers (Nobody knows / Doesn't apply) are
  // NOT here anymore — they live in `ui/off-ladder`, a sibling each card positions
  // for itself (spec §4.8 / ADR-0009): the fan-out cards mount them under the
  // placement tray, the single-unit card beneath this ladder. Every rung is a drop
  // hot spot (`dropTarget`), a no-op when there is no drag session.
  type Props = {
    rungs: Rung[];             // question.ladder, rendered in AUTHORED order
    sealLevels: SealLevel[];   // supplies each rung's level name for the rail
    selected: string | null;   // the answered rung id, or null when unanswered / fan-out
    ariaLabel: string;         // radiogroup accessible name (the question text)
    onSelect: (rungId: string) => void;
    rungContent?: Snippet<[string]>;
    onDropRung?: (rungId: string, payload: P) => void;
  };
  let {
    rungs,
    sealLevels,
    selected,
    ariaLabel,
    onSelect,
    rungContent,
    onDropRung,
  }: Props = $props();

  // Authored order, first authored rung at the top: the ladder is the author's
  // sequence, never a SEAL sort (instrument.md §6 invariant #4).

  let rungEls = $state<Record<string, HTMLButtonElement | null>>({});
  let activeRow = $state<string | null>(null);
  const active = $derived<string | null>(activeRow ?? selected ?? rungs[0]?.id ?? null);

  function chooseRow(rungId: string): void {
    activeRow = rungId;
    onSelect(rungId);
    rungEls[rungId]?.focus(); // focus works regardless of the tabindex reactive lag
  }
  function onKeydown(e: KeyboardEvent): void {
    const i = rungs.findIndex((r) => r.id === active);
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const r = rungs[Math.max(0, i - 1)];
      if (r !== undefined) chooseRow(r.id);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const r = rungs[Math.min(rungs.length - 1, i + 1)];
      if (r !== undefined) chooseRow(r.id);
    } else if (/^[1-9]$/.test(e.key)) {
      e.preventDefault();
      const r = rungAtPosition({ ladder: rungs }, Number(e.key));
      if (r) chooseRow(r.id); // past the end of the ladder → no-op, never nearest (ADR-0023)
    }
  }
</script>

<div role="radiogroup" aria-label={ariaLabel} tabindex={-1} onkeydown={onKeydown}>
  {#each rungs as rung, i (rung.id)}
    <LadderRung
      {rung}
      levelName={sealName(sealLevels, rung.seal)}
      selected={selected === rung.id}
      focusable={rung.id === active}
      position={i + 1}
      first={i === 0}
      last={i === rungs.length - 1}
      onChoose={() => chooseRow(rung.id)}
      bind:ref={rungEls[rung.id]}
      {rungContent}
      {onDropRung}
    />
  {/each}
</div>
