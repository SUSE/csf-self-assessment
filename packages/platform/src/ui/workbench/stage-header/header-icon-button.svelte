<script lang="ts">
  import type { LucideIcon } from '@lucide/svelte';
  import { buttonVariants } from '../../button';
  import * as Tooltip from '../../tooltip';
  import { getHelp } from '../../rulebook/help.svelte';
  import { cn } from '../../../utils/cn';

  // The header's toolbar button: a lucide icon in a square icon-button wrapped in
  // a tooltip, with an optional destructive dot when a strict-validation issue
  // lands on the target. `active` drives the pressed/selected styling and emits
  // aria-pressed — omit it for action buttons (Add) that select nothing.
  //
  // Selecting a tab is NAVIGATION, not a good/done outcome, so the pressed state is
  // NEUTRAL, never `primary` green (invariant #3 — green means SEAL-3/4 and
  // completion, nothing structural). Active reads as a filled `bg-accent` chip with
  // a foreground ring: unmistakably "current" and distinct from an inactive
  // button's hover (accent fill, no ring). Green-free in both apps.
  // `disabled` greys the button and blocks the click (e.g. Questions with no
  // active claim); the tooltip still explains what the target is.
  //
  // The hover fill is stated HERE, not inherited: the `outline` variant hovers to
  // `hover:bg-muted` / `dark:hover:bg-input/50`, and under the imported dark
  // palettes `--muted`/`--input` sit within ~0.03 L of the header surface — the
  // hover was invisible, so a toolbar of eight icons gave no feedback at all
  // (reported from a dark screenshot). `dark:hover:bg-accent` carries the same
  // prefix as the variant's `dark:hover:` class so tailwind-merge DROPS the
  // weaker one — a bare `hover:bg-accent` would leave it standing and lose to it
  // in dark. Accent is what the neighbouring QuestionNav step buttons hover to,
  // so the whole stage header now highlights in one vocabulary. The active chip
  // needs `dark:bg-accent` for the same reason (the variant's `dark:bg-input/30`
  // was flattening the pressed fill to grey in dark, leaving only the ring).
  //
  // HELP MODE (ui/rulebook): while it is on, this button navigates AND explains.
  // Pass `rule` — the id of the card that governs whatever the button reaches — and
  // in help mode a press does its normal navigation and ALSO promotes that card, so
  // you land on the page with its rule already up beside it. Reading a rule about a
  // page you cannot see is the thing this avoids.
  // A button whose `rule` has no card in the reader's set has nothing to add and is
  // disabled, so the header shows at a glance what help covers. A button the CALLER
  // disabled stays disabled — the press still navigates, so the caller's reason to
  // block it still holds; its card is reachable in the panel's own list.
  // The gating lives HERE, not in each toolbar, because three toolbars (author
  // stage-header, assessment, facilitator) render this same button and a per-toolbar
  // copy of the rule would drift the moment one of them changed.
  type Props = {
    label: string;
    Icon: LucideIcon;
    active?: boolean;
    flagged?: boolean;
    disabled?: boolean;
    /** The rulebook card that explains this button's target, if one does. */
    rule?: string | undefined;
    /** Exempt from help-mode gating — the help toggle itself, which must stay
     *  pressable to be the way back out. */
    helpExempt?: boolean;
    class?: string;
    onclick: () => void;
  };
  let {
    label,
    Icon,
    active,
    flagged = false,
    disabled = false,
    rule,
    helpExempt = false,
    class: className,
    onclick,
  }: Props = $props();

  const help = getHelp();
  const gated = $derived(help !== null && help.open && !helpExempt);
  /** In help mode with a card to add: the press navigates and promotes it. */
  const explains = $derived(gated && help!.has(rule));
  /** In help mode with nothing to add. */
  const mute = $derived(gated && !help!.has(rule));

  const name = $derived(explains ? `${label} — with its rule` : label);

  function press(): void {
    onclick();
    if (explains) help!.cite(rule!);
  }
</script>

<Tooltip.Root>
  <Tooltip.Trigger
    aria-label={name}
    aria-pressed={active}
    disabled={disabled || mute}
    class={cn(
      buttonVariants({ variant: 'outline', size: 'icon' }),
      'relative hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent',
      active &&
        'border-foreground/60 bg-accent text-foreground ring-1 ring-inset ring-foreground/50 hover:bg-accent hover:text-foreground dark:bg-accent',
      className,
    )}
    onclick={press}
  >
    <Icon class="size-4" />
    {#if flagged}
      <span class="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-destructive"></span>
    {/if}
  </Tooltip.Trigger>
  <Tooltip.Content>{name}</Tooltip.Content>
</Tooltip.Root>
