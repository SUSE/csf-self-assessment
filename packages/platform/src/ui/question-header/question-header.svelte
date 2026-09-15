<script lang="ts">
  import type { Materiality } from '../../schema';
  import { gates } from '../../score-engine';
  import type { QuestionCoverage } from '../../assessment';
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
  import CircleCheck from '@lucide/svelte/icons/circle-check';
  import CircleDot from '@lucide/svelte/icons/circle-dot';
  import Circle from '@lucide/svelte/icons/circle';
  import Ban from '@lucide/svelte/icons/ban';
  import { buttonVariants } from '../button';
  import * as Tooltip from '../tooltip';
  import * as AlertDialog from '../alert-dialog';
  import { cn } from '../../utils/cn';

  // The shared question header for every answering card (the fan-out card and
  // ladder-card): the "answering as <role>" identity line, the loud question, and
  // the italic-less "why" rationale rail. Extracted so both cards render an
  // identical header (build once, wire twice) — only `grainLabel` differs per
  // grain/axis. STATELESS. no truth computed here.
  
  // The top-right controls row carries the completeness INDICATOR (the question's
  // progress, formerly the footer's left half) and, when `onReset` is supplied, a
  // reset control that clears this question back to how it loaded from the workbook
  // (confirm-gated, since it discards the placed answers — the ConfirmAction
  // convention). `canReset` disables reset when there is nothing to clear.
  
  // "Complete" is `coverage === 'answered'` — every in-scope unit DEALT WITH — the
  // SAME rule the pager's solid circle uses, so the two never disagree. Green signals
  // a good/done outcome (SEAL-3/4 AND completion,), so "Complete" is
  // GREEN here — the same green as the nav's answered tick — while every non-done
  // state stays muted. Weight (font-medium) is the redundant channel alongside hue.
  type Props = {
    roleName: string;        // resolved person name — the loud element
    role: string;            // raw role id — the small muted chip
    materiality: Materiality;
    text: string;            // the question
    why: string | undefined; // the rationale rail. absent renders nothing
    coverage: QuestionCoverage; // drives the top-right progress indicator
    grainLabel?: string;     // "dimension grain — one answer per dimension", etc.
    onReset?: () => void;    // clear every answer for this question (undefined → no reset control)
    canReset?: boolean;      // false → the reset control is present but disabled
  };
  let { roleName, role, materiality, text, why, coverage, grainLabel, onReset, canReset = false }: Props = $props();

  const PROGRESS_LABEL: Record<QuestionCoverage, string> = {
    answered: 'Complete',
    partial: 'In progress',
    unanswered: 'Not answered',
    inapplicable: 'Nothing to answer here',
  };

  let confirmOpen = $state(false);
  function confirmReset(): void {
    confirmOpen = false;
    onReset?.();
  }
</script>

<header class="space-y-3">
  <div class="flex items-start justify-between gap-3">
    <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <span class="text-muted-foreground">answering as</span>
      <span class="font-semibold text-foreground">{roleName}</span>
      <span class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs uppercase tracking-wide text-muted-foreground">{role}</span>
      {#if grainLabel}
        <span aria-hidden="true" class="text-muted-foreground/60">·</span>
        <span class="text-muted-foreground">{grainLabel}</span>
      {/if}
      {#if !gates(materiality)}
        <span class="rounded border border-border px-2 py-0.5 text-xs italic text-muted-foreground">
          {materiality}
        </span>
      {/if}
    </div>

    <div class="flex shrink-0 items-center gap-2">
      <!-- Question progress (formerly the footer's left half): icon + label. "Complete"
     is green (a done outcome). every other state is muted. Weight is the
     redundant, colour-independent channel. -->
      <span class="flex items-center gap-1.5 text-sm">
        {#if coverage === 'answered'}
          <CircleCheck class="size-4 shrink-0 text-positive" aria-hidden="true" />
        {:else if coverage === 'partial'}
          <CircleDot class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        {:else if coverage === 'inapplicable'}
          <Ban class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        {:else}
          <Circle class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        {/if}
        <span class="font-medium {coverage === 'answered' ? 'text-positive' : 'text-muted-foreground'}">{PROGRESS_LABEL[coverage]}</span>
      </span>

      {#if onReset}
        <Tooltip.Provider delayDuration={300}>
          <Tooltip.Root>
            <Tooltip.Trigger
              aria-label="Reset this question"
              disabled={!canReset}
              class={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'size-8 shrink-0 text-muted-foreground hover:text-foreground')}
              onclick={() => (confirmOpen = true)}
            >
              <RotateCcw class="size-4" />
            </Tooltip.Trigger>
            <Tooltip.Content>Reset this question</Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
      {/if}
    </div>
  </div>

  <h2 class="text-pretty text-2xl font-semibold leading-tight tracking-tight text-foreground">{text}</h2>

  {#if why}
    <aside class="border-l-2 border-border pl-4 text-reading leading-relaxed text-muted-foreground">{why}</aside>
  {/if}
</header>

{#if onReset}
  <AlertDialog.Root bind:open={confirmOpen}>
    <AlertDialog.Content>
      <AlertDialog.Header>
        <AlertDialog.Title>Reset this question?</AlertDialog.Title>
        <AlertDialog.Description>
          This clears every answer placed for this question and returns it to how it loaded from the workbook. No other question is touched.
        </AlertDialog.Description>
      </AlertDialog.Header>
      <AlertDialog.Footer>
        <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
        <AlertDialog.Action onclick={confirmReset}>Reset question</AlertDialog.Action>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  </AlertDialog.Root>
{/if}
