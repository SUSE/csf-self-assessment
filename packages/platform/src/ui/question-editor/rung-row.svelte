<script lang="ts">
  import type { Rung, SealLevel } from '../../schema';
  import { SealSchema } from '../../schema';
  import type { RungMove, RungPatch } from '../../author';
  import { Input, Select, Textarea } from '../forms';
  import { sealInkClass, sealSwatchClass } from '../../utils/seal-color';
  import { cn } from '../../utils/cn';
  import { QUIET_FIELD } from './quiet-field';
  import RowAction from './row-action.svelte';
  import ChevronUp from '@lucide/svelte/icons/chevron-up';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import Eraser from '@lucide/svelte/icons/eraser';

  // ONE rung of the ladder editor, wearing the participant's rung (ui/ladder):
  // the badge threaded on the staircase rail, the rung's own points and SEAL on
  // the eyebrow, its text as the row's prose. The geometry is ui/ladder's to the
  // pixel, so the author's ladder and the participant's stay one object.
  
  // The badge shows POSITION, not SEAL: SEALs repeat on a hosted ladder, so the
  // digit alone would name nothing. It keeps the SEAL's swatch and ink.
  type Props = {
    rung: Rung;
    /** 1-based index in authored order — the handle the author reads and the
     * digit will bind at answer time.*/
    position: number;
    /** Ladder length: the first and last rows disable the move they cannot make.*/
    total: number;
    /** The workbook's SEAL scale — this row's select offers exactly these.*/
    sealLevels: SealLevel[];
    onPatch: (patch: RungPatch) => void;
    onMove: (move: RungMove) => void;
    onRemove: () => void;
  };
  let { rung, position, total, sealLevels, onPatch, onMove, onRemove }: Props = $props();
</script>

<div class="group relative px-2 py-3">
  <!-- Staircase rail: segments overrun 2px past the row's edges so no gap can
     open between neighbours (ui/ladder). -->
  {#if position !== 1}
    <span
      aria-hidden="true"
      class="pointer-events-none absolute -top-0.5 left-6 h-[30px] w-px -translate-x-1/2 bg-border"
    ></span>
  {/if}
  {#if position !== total}
    <span
      aria-hidden="true"
      class="pointer-events-none absolute -bottom-0.5 left-6 top-7 w-px -translate-x-1/2 bg-border"
    ></span>
  {/if}

  <div class="flex items-start gap-4">
    <span class="relative z-10 shrink-0 rounded-md bg-card">
      <span
        aria-hidden="true"
        class={cn(
          'grid size-8 place-items-center rounded-md border border-transparent text-sm font-semibold',
          sealSwatchClass(rung.seal),
          sealInkClass(rung.seal),
        )}>{position}</span
      >
    </span>

    <div class="min-w-0 flex-1 space-y-1">
      <div class="flex flex-wrap items-center gap-2">
        <!-- Wears the participant's eyebrow (ui/ladder), so it outranks the 15px
     description instead of tying with it, and takes the rung's own ramp ink
     so the level reads at the same step as its badge. -->
        <Select
          density="compact"
          class={cn(
            'w-auto text-xs font-semibold uppercase tracking-wide',
            sealInkClass(rung.seal),
          )}
          aria-label={`SEAL for rung ${position}`}
          value={String(rung.seal)}
          onchange={(e) => onPatch({ seal: SealSchema.parse(Number(e.currentTarget.value)) })}
        >
          {#each sealLevels as level (level.seal)}
            <option value={String(level.seal)}>SEAL-{level.seal} · {level.name}</option>
          {/each}
        </Select>
        <!-- Tabular figures, and the unit named — a bare `100` beside a SEAL names
     nothing. `onchange`: a half-typed `41.` must not rewrite the draft. -->
        <label class="flex items-center gap-1.5 text-xs text-muted-foreground" data-rule="value">
          value
          <Input
            type="number"
            step="any"
            min="0"
            density="compact"
            class="w-24 tabular-nums"
            aria-label={`Value for rung ${position}`}
            value={String(rung.points)}
            onchange={(e) => onPatch({ points: Number(e.currentTarget.value) })}
          />
        </label>
        <div class="ml-auto flex items-center gap-0.5">
          <RowAction
            icon={ChevronUp}
            label={`Move rung ${position} earlier`}
            title="Move this rung one step down the ladder"
            disabled={position === 1}
            onclick={() => onMove('earlier')}
          />
          <RowAction
            icon={ChevronDown}
            label={`Move rung ${position} later`}
            title="Move this rung one step up the ladder"
            disabled={position === total}
            onclick={() => onMove('later')}
          />
          <RowAction
            icon={Eraser}
            label={`Remove rung ${position}`}
            title="Remove this rung — this also clears any test-estate answer pinned to it"
            onclick={onRemove}
          />
        </div>
      </div>
      <!-- Reading type, capped at the card's own 72ch: the ladder column grows with
     whatever the side panels leave it, and prose must not run past a measure. -->
      <Textarea
        rows={2}
        class={cn(QUIET_FIELD, 'max-w-[72ch] text-reading leading-relaxed')}
        placeholder="What this rung says the estate does"
        aria-label={`Rung description for rung ${position}`}
        value={rung.description}
        oninput={(e) => onPatch({ description: e.currentTarget.value })}
      />
    </div>
  </div>
</div>
