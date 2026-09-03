<script lang="ts">
  import type { Rung } from '../../schema';
  import { Button } from '../button';
  import * as RadioGroup from '../radio-group';
  import { SealSelector, type SealChoice } from '../seal-selector';
  import { cn } from '../../utils/cn';
  import Eraser from '@lucide/svelte/icons/eraser';

  // One reference estate's answer to this question — "which rung would this estate
  // honestly pick?" — as the gauge face the merge queue already presses
  // (ui/seal-selector) rather than a row of hand-rolled outline buttons.
  //
  // Reading three of these together is the point: three picks sitting on the same
  // cell is a ladder that cannot tell Profile A, BASE and M apart, which is the
  // whole reason the reference estates are on this card.
  //
  // Every cell is an authored rung, so nothing here is disabled; the cells print
  // rung POSITIONS, tinted by each rung's own SEAL.
  type Props = {
    estateName: string;
    /** This question's ladder, in authored order. Every entry is pickable. */
    rungs: Rung[];
    /** The rung this estate names, or null when unanswered. */
    chosen: string | null;
    onPick: (rungId: string) => void;
    onClear: () => void;
  };
  let { estateName, rungs, chosen, onPick, onClear }: Props = $props();

  const choices = $derived(
    rungs.map(
      (rung, i): SealChoice => ({
        seal: rung.seal,
        value: rung.id,
        mark: String(i + 1),
        label: `${estateName} · rung ${i + 1} · SEAL-${rung.seal} · ${rung.description}`,
      }),
    ),
  );

  // Wired to BOTH the group's `onValueChange` (which is how the keyboard picks a
  // cell, with no click involved) and the selector's `onPick` (which fires on
  // every press, including one on the cell that is already the value). Setting an
  // answer is idempotent, so the two firing for one click is the same answer
  // twice, never a toggle back off — clearing is the control beside them.
  function pick(value: string): void {
    const rung = rungs.find((r) => r.id === value);
    if (rung !== undefined) onPick(rung.id);
  }
</script>

<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
  <span class="min-w-0 flex-1 text-xs text-foreground" title={estateName}>{estateName}</span>
  <RadioGroup.Root
    class="w-auto"
    value={chosen ?? ''}
    onValueChange={pick}
    aria-label={`${estateName} — which rung would this estate pick?`}
  >
    <SealSelector {choices} onPick={pick} />
  </RadioGroup.Root>
  <!-- `invisible` when there is nothing to clear, not a disabled ghost: it holds
       its slot so the cells never shift as answers land, and an unanswered row
       carries no mark at all. -->
  <Button
    variant="ghost"
    size="icon-xs"
    class={cn('text-muted-foreground hover:text-foreground', chosen === null && 'invisible')}
    disabled={chosen === null}
    aria-label={`Clear ${estateName}’s answer`}
    title="Clear this estate’s answer"
    onclick={onClear}
  ><Eraser /></Button>
</div>
