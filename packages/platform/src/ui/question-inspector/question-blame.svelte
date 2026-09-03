<script lang="ts">
  import type { Question, Target } from '../../schema';
  import type { BlameUnit } from '../../merge';
  import { targetKey } from '../../assessment';
  import { UnitLedger } from '../unit-ledger';
  import { eyebrowVariants } from '../panel';
  import { cn } from '../../utils/cn';

  // How every answer unit this question ever touched came to stand as it does
  // (merge.md §4.1, invariant #5) — read off the ledger, so a unit a grain
  // decision emptied is still explained. Data, not judgment. `selected` is the exact
  // unit the rail was opened on (landing-history §4.6): marked, and scrolled to.
  type Props = { blame: BlameUnit[]; question: Question; selected: Target | null };
  let { blame, question, selected }: Props = $props();

  let section: HTMLElement | undefined;

  $effect(() => {
    const key = selected === null ? null : targetKey(selected);
    if (key === null || section === undefined) return;
    section.querySelector(`[data-blame-unit="${key}"]`)?.scrollIntoView({ block: 'center' });
  });
</script>

<section
  class="space-y-2"
  aria-label="How these answers came to be"
  data-question-blame
  bind:this={section}
>
  <!-- Ruled rather than bigger: the unit labels below are eyebrows too, so this one
       outranks them by the rule under it, not by a size step off the ramp. -->
  <h4 class={cn(eyebrowVariants(), 'border-b border-border pb-1')}>How these answers came to be</h4>
  {#each blame as unit (targetKey(unit.target))}
    {@const current = selected !== null && targetKey(selected) === targetKey(unit.target)}
    <div
      data-blame-unit={targetKey(unit.target)}
      data-blame-selected={current ? '' : undefined}
      aria-current={current ? 'true' : undefined}
      class={current ? 'rounded-md ring-1 ring-inset ring-foreground/30' : undefined}
    >
      <UnitLedger label={unit.label} entries={unit.entries} {question} />
    </div>
  {/each}
</section>
