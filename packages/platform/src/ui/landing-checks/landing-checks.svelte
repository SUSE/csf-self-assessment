<script lang="ts">
  import type { LandingChecks } from '../../merge';
  import * as Collapsible from '../collapsible';
  import { Panel, PanelHeader } from '../panel';
  import BindingLanes from './binding-lanes.svelte';
  import FloorStrip from './floor-strip.svelte';
  import { landingChecksView } from './model';

  // The status checks under the landing header (merge.md §4.2), split into what
  // BLOCKS landing and what is only recorded. A PREVIEW: what the estate would
  // read if this landing were committed as decided so far, never the estate
  // result and never a floor for the partial (invariant #11). Computes nothing —
  // every number arrives in `checks`; `landingChecksView` only rearranges them.
  //
  // The answers pinning the floor are a DISCLOSURE opened from the marked rung on
  // the strip — you ask the floor what holds it down. At rest the panel counts them
  // and draws where the floor sits; opened, they group by the part of the estate
  // they hold down. There is deliberately no separate expand control in the header.
  type Props = { checks: LandingChecks; incomingName: string; collisions: number };
  let { checks, incomingName, collisions }: Props = $props();

  // A reading aid, not a restorable view — the same call `dashboard.svelte` makes
  // for its provenance tint.
  let open = $state(false);

  const view = $derived(landingChecksView(checks, collisions));
  const unplaced = $derived(checks.coverage.total - checks.coverage.placed);
  const climb = $derived(
    view.floor.unlocksTo === null
      ? 'Lifting them all clears every gate on the estate.'
      : `Lifting them all would read SEAL ${view.floor.unlocksTo}.`,
  );
  const pins = $derived(
    `Pinned by ${count(view.pins.answers, 'answer', 'answers')} across ${count(view.pins.questions, 'question', 'questions')} and ${count(view.pins.targets, 'part', 'parts')} of the estate.`,
  );

  function count(n: number, one: string, many: string): string {
    return `${n} ${n === 1 ? one : many}`;
  }

  const label = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground';
  // Two track sets, and which one applies is the whole point. Once the registers
  // are in three columns the label track takes the slack, so every value lands on
  // its register's own right edge — a column of right-aligned numbers ending at
  // the hairline, scannable down as well as across. STACKED, a register is the
  // full panel wide and that same stretch would fling a single digit a screen
  // away from its label, so the tracks go back to content-sized and the value
  // sits beside the label. A stretched label track is only ever safe against a
  // BOUNDED register.
  const grid =
    'grid grid-cols-[minmax(0,max-content)_max-content] gap-x-3 gap-y-1 text-sm @3xl/checks:grid-cols-[minmax(0,1fr)_max-content]';
  const value = 'text-right tabular-nums text-foreground';

  // One register. The padding and the border are RESERVED on all three (the
  // Reserved Border Rule) so the blocked tint recolours a box that is already
  // there: the three eyebrows keep one baseline whether a gate is live or not.
  const register = 'space-y-2 rounded-md border border-transparent p-2';
  // A register is separated from the one before it by a hairline in the gutter,
  // not by empty space — the rule turns with the row, so the structure reads the
  // same stacked as it does side by side. `border-l-border` / `border-t-border`
  // recolour only the reserved edge that separates; plain `border-border` would
  // ink all four and box the register in. The paddings put 1rem of air on both
  // sides of the rule in each direction (`gap-x-4` + `pl-6` across, `p-2` +
  // `gap-y-2` + `pt-4` down).
  // The row turns on the PANEL's width, not the viewport's: both side rails
  // collapse independently, so the same window can hand this panel 1300px or
  // 500px. `@container` is the mechanism `ui/answer-columns` already uses for
  // exactly that reason.
  const ruled = `${register} border-t-border pt-4 @3xl/checks:border-t-transparent @3xl/checks:border-l-border @3xl/checks:pt-2 @3xl/checks:pl-6`;
</script>

<Collapsible.Root bind:open>
  <!-- Every section on the Merge review wears the same Panel (see landing-header).
       `@container/checks` rides along on `class`: the ruled row below turns on the
       PANEL's width, not the viewport's. -->
  <Panel class="@container/checks space-y-4" aria-label="Landing checks" data-landing-checks>
    <PanelHeader
      title="Landing checks"
      description="preview — what the estate would read if this landing were committed; the floor is minted at finalize"
    />

    <!-- Three registers on ONE ruled row, in the order the facilitator reads them
         with a finger on Land: what stops this (exactly what `canLand` reads),
         what is only recorded and blocks nothing (merge.md §4.2), then what the
         estate would read. They are NOT the same kind of thing and three lists
         stacked in a column read as one, so parallel eyebrows and a hairline in
         each gutter keep the distinction structural.
         Three EQUAL shares of the row, not three content-sized blocks packed
         left: the registers spread over whatever width the stage gives them, the
         two rules land on the thirds, and each register's values right-align to
         its own edge instead of the row trailing off into empty card. Equal
         rather than weighted, because a register the facilitator has to find
         twice is worse than one carrying some slack. The tinted box appears only when a gate
         is live, so at rest the panel stays quiet and state is the only thing
         drawing the eye; the verdict sentence means the reading never rides on
         colour. -->
    <!-- `-mx-2` cancels the registers' reserved padding at the row's two ends, so
         the first eyebrow keeps the panel title's left margin, the last value
         keeps its right margin, and the tint box still has somewhere to grow. -->
    <div class="-mx-2 grid gap-x-4 gap-y-2 @3xl/checks:grid-cols-3">
      <div
        class={[
          register,
          view.blocked && 'border-destructive/40 bg-destructive/10',
        ]}
      >
        <p class={label}>Blocks landing</p>
        <p class="text-sm text-foreground" data-checks-verdict>
          {view.blocked
            ? 'Decide these before this partial can land.'
            : 'Nothing blocks this landing.'}
        </p>
        <dl class={grid}>
          <dt class="text-muted-foreground" data-check="undecided">Undecided clashes</dt>
          <dd class={value}>{view.gates.undecided}</dd>
          <dt class="text-muted-foreground" data-check="collisions">Provider id collisions</dt>
          <dd class={value}>{view.gates.collisions}</dd>
        </dl>
      </div>

      <div class={ruled}>
        <p class={label}>Recorded · does not block</p>
        <dl class={grid}>
          <dt class="text-muted-foreground" data-check="placed">Units placed</dt>
          <dd class={value}>{checks.coverage.placed} of {checks.coverage.total}</dd>
          <dt class="text-muted-foreground" data-check="dont-know">Don’t knows</dt>
          <dd class={value}>{checks.dontKnow}</dd>
          <dt class="text-muted-foreground" data-check="out-of-claim">
            Out of claim — outside every claim {incomingName} made
          </dt>
          <dd class={value}>{checks.outOfClaim}</dd>
        </dl>
        {#if unplaced > 0}
          <p class="text-xs text-muted-foreground">
            {count(unplaced, 'unit', 'units')} in scope {unplaced === 1 ? 'has' : 'have'} no answer
            yet.
          </p>
        {/if}
      </div>

      <div class={ruled} data-check="floor">
        <p class={label}>SEAL floor preview</p>
        {#if view.floor.seal === null}
          <p class="text-sm text-foreground" data-floor-value>—</p>
          <p class="max-w-[68ch] text-xs text-muted-foreground">
            No answer gates the estate yet, so there is no floor to preview.
          </p>
        {:else}
          <!-- The marked cell IS the value: no `SEAL n` restated beside it. The
               don't-know count that used to ride along is the same number as the
               Recorded register's, under a second name. It is also the control
               that reveals the answers pinning it — see floor-strip. -->
          <FloorStrip floor={view.floor} {open} />
          <!-- Capped measure: this register absorbs the panel's slack, and its two
               sentences must not stretch into one unreadable line across it. -->
          <p class="max-w-[68ch] text-xs text-muted-foreground">{pins} {climb}</p>
          <p class="sr-only">
            The preview floor is SEAL {view.floor.seal} of 4. {pins} {climb}
          </p>
        {/if}
      </div>
    </div>

    <!-- The disclosure is the one thing that wants the whole panel: it spans all
         three registers under a hairline, so opening the floor reads as the panel
         extending rather than as a fourth register appearing. -->
    <Collapsible.Content class="space-y-2 border-t border-border pt-3">
      <p class={label}>What pins the floor</p>
      <BindingLanes lanes={view.lanes} />
    </Collapsible.Content>
  </Panel>
</Collapsible.Root>
