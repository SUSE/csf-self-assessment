<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils/cn';
  import ShellHeader from './shell-header.svelte';
  import ShellFooter from './shell-footer.svelte';
  import Sidebar from './sidebar.svelte';

  // The app chrome: a ShellHeader, an optional collapsible panel on each side, a
  // scrollable main region, and a ShellFooter. Panel collapse controls live
  // inside the panels (see Sidebar), so the header stays clean. Apps are thin
  // shells (spec §3) — they compose this and pour content into the snippets; the
  // chrome lives here in `platform`, once. This container owns only the panel
  // open-state and the layout skeleton; the header and footer are their own units.

  type Props = {
    /** Short subtitle beside the logo (the logo carries the product name). */
    title?: string;
    logoLabel?: string;
    /** Left panel body. The panel appears only when this is provided. */
    left?: Snippet;
    leftTitle?: string;
    /** Left collapsed-rail content; receives an `expand` callback. */
    leftRail?: Snippet<[expand: () => void]>;
    /** Right panel body. The panel appears only when this is provided. */
    right?: Snippet;
    rightTitle?: string;
    /** Open width of the right panel (denser HUDs want more room). */
    rightWidth?: string;
    /** Right collapsed-rail content; receives an `expand` callback. */
    rightRail?: Snippet<[expand: () => void]>;
    /**
     * Right panel open state — bindable so a screen can drive it (e.g. collapse
     * it automatically when there's nothing to show). Defaults open; the in-panel
     * chevron toggles it either way, so binding is optional.
     */
    rightOpen?: boolean;
    /** Extra header controls, placed left of the theme toggle. */
    actions?: Snippet;
    /**
     * A floating layer over the content row — a panel that appears without
     * displacing anything (today: the Rulebook in help mode). It spans exactly
     * between header and footer and paints over the side panels, so a floating
     * panel can cover a rail whether that rail is open or collapsed.
     *
     * It belongs HERE rather than inside a screen because a screen's stage renders
     * inside StageLayout's transformed carousel, and `position` resolves against a
     * transformed ancestor — a panel mounted there would travel with the stage and
     * clip at its edge. The layer itself is pointer-transparent; a panel inside it
     * re-arms interaction with `pointer-events-auto`, so everything the panel does
     * not cover stays usable.
     */
    overlay?: Snippet;
    /** Footer content; a neutral default is shown when omitted. */
    footer?: Snippet;
    children: Snippet;
    class?: string;
  };

  let {
    title,
    logoLabel = 'Cloud Sovereignty',
    left,
    leftTitle,
    leftRail,
    right,
    rightTitle,
    rightWidth = '18rem',
    rightRail,
    rightOpen = $bindable(true),
    actions,
    overlay,
    footer,
    children,
    class: className,
  }: Props = $props();

  // Both panels collapse independently. The left starts open and is owned here;
  // the right's open state is a bindable prop (owned by the caller when it binds,
  // defaulting open otherwise) so a screen can collapse it in response to state.
  let leftOpen = $state(true);

  const uid = $props.id();
  const leftId = `${uid}-left`;
  const rightId = `${uid}-right`;
</script>

<!-- Viewport-bounded shell: fixed to the screen height with the page itself never
     scrolling, so the main region and each side panel own an internal scroll and
     stay put relative to the viewport (a tall Rulebook or HUD scrolls in place,
     it never pushes the page). -->
<div class={cn('flex h-svh flex-col overflow-clip bg-background text-foreground', className)}>
  <ShellHeader {logoLabel} {title} {actions} />

  <!-- `relative` so the overlay layer positions against this row: it must stop at
       the header and the footer, which a viewport-fixed panel could only do by
       hardcoding their heights.
       `overflow-clip`, not `hidden`: a scroll container's layout overflow still
       propagates here, which makes this row (and the shell above it) PROGRAMMATICALLY
       scrollable even though nothing can scroll it by wheel — so focusing a button
       that is not fully in view scrolls the whole shell out of the viewport and
       leaves a dead band under the footer. `clip` gives the box no scroll origin at
       all, which is what "the page itself never scrolls" has to mean. -->
  <div class="relative flex min-h-0 flex-1 overflow-clip">
    {#if left}
      <Sidebar
        side="left"
        open={leftOpen}
        onToggle={() => (leftOpen = !leftOpen)}
        title={leftTitle}
        id={leftId}
        rail={leftRail}
      >
        {@render left()}
      </Sidebar>
    {/if}

    <main class="min-w-0 flex-1 overflow-y-auto">
      {@render children()}
    </main>

    {#if right}
      <Sidebar
        side="right"
        open={rightOpen}
        onToggle={() => (rightOpen = !rightOpen)}
        title={rightTitle}
        id={rightId}
        width={rightWidth}
        rail={rightRail}
      >
        {@render right()}
      </Sidebar>
    {/if}

    {#if overlay}
      <div class="pointer-events-none absolute inset-0 z-30">
        {@render overlay()}
      </div>
    {/if}
  </div>

  <ShellFooter {footer} />
</div>
