<script lang="ts" generics="P extends DragPayload">
  import type { Snippet } from 'svelte';
  import { getDnd, dropTarget, type DragPayload } from '../dnd';
  import type { OffKind } from './types';

  // The two OFF-LADDER escape hatches (Nobody knows / Doesn't apply), extracted
  // from the ladder so each card can position them where its layout wants: the
  // fan-out cards mount them right under the placement tray — next to the units,
  // no scroll past the rungs to reach them — the single-unit card below its
  // ladder. They are real answers, off the graded scale:
  // each is a drop hot spot (drag a chip here), a tap/keyboard radio, and — in the
  // fan-out cards — a rest for chips answered n/a / don't-know. Its own radiogroup.
  // layout-neutral (no outer margin/divider — the caller owns spacing). Neutral
  // only ( — never green).

  type Props = {
    /** single-unit: which off row is the chosen answer (neutral tick). fan-out leaves it null.*/
    selectedOff?: OffKind | null;
    onOffLadder?: (kind: OffKind) => void;
    onDropOff?: (kind: OffKind, payload: P) => void;
    /** resting chips (fan-out). the single-unit card omits it.*/
    offLadderContent?: Snippet<[OffKind]>;
  };
  let { selectedOff = null, onOffLadder, onDropOff, offLadderContent }: Props = $props();

  const dnd = getDnd<P>(); // undefined on the single-unit card → drop targets no-op

  const OFF: { kind: OffKind; label: string; glyph: string; key: string; hint: string }[] = [
    { kind: 'dont-know', label: 'Nobody knows', glyph: '◇', key: 'U', hint: 'Recorded as an unknown — never counted as zero; it travels with the result as a count.' },
    { kind: 'na', label: "Doesn't apply", glyph: '⊘', key: 'N', hint: 'Excluded from the assessment entirely.' },
  ];

  let offEls = $state<Record<string, HTMLButtonElement>>({});
  let activeRow = $state<OffKind | null>(null);
  const active = $derived<OffKind | null>(activeRow ?? selectedOff ?? OFF[0]?.kind ?? null);

  function chooseRow(kind: OffKind): void {
    activeRow = kind;
    onOffLadder?.(kind);
    offEls[kind]?.focus(); // focus works regardless of the tabindex reactive lag
  }
  function onKeydown(e: KeyboardEvent): void {
    const i = OFF.findIndex((o) => o.kind === active);
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const r = OFF[Math.max(0, i - 1)];
      if (r) chooseRow(r.kind);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const r = OFF[Math.min(OFF.length - 1, i + 1)];
      if (r) chooseRow(r.kind);
    }
  }

  // Drop hot-spot styling: while a drag is live
  // every row shows a dashed outline. the one under the pointer goes solid + filled.
  // Neutral only . Just the border-style/colour so it never fights the
  // container's baseline `border`.
  function overClass(key: string): string {
    if (!dnd?.dragging) return 'border-transparent';
    return dnd.over === key
      ? 'border-solid border-foreground bg-accent'
      : 'border-dashed border-border';
  }
</script>

<!-- The dashed pill previewing WHAT will land under the pointer (twin of the ladder's). -->
{#snippet landingPreview(key: string)}
  {#if dnd?.over === key && dnd.active}
    <span
      class="inline-flex items-center gap-1.5 rounded-full border border-dashed border-foreground px-3 py-1 text-xs font-medium text-foreground"
      aria-hidden="true"
    >
      {#if dnd.active.payload.critical}<span class="text-warning-ink">⚑</span>{/if}<span>{dnd.active.payload.label}</span><span class="text-muted-foreground">lands here</span>
    </span>
  {/if}
{/snippet}

<div role="radiogroup" aria-label="Both are real answers" tabindex={-1} onkeydown={onKeydown} class="space-y-1">
  <p class="px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground/70">If you can’t place it — both are real answers</p>
  {#each OFF as row (row.kind)}
    <div
      class="rounded-lg border transition-colors {overClass(`off:${row.kind}`)}"
      use:dropTarget={{ session: dnd, key: `off:${row.kind}`, onDrop: (payload) => onDropOff?.(row.kind, payload) }}
    >
      <button
        type="button"
        role="radio"
        aria-checked={selectedOff === row.kind}
        tabindex={row.kind === active ? 0 : -1}
        bind:this={offEls[row.kind]}
        onclick={() => chooseRow(row.kind)}
        class="group flex w-full items-start gap-4 rounded-lg px-2 py-3 text-left transition-colors {selectedOff === row.kind
          ? 'bg-accent ring-1 ring-inset ring-border'
          : 'hover:bg-accent/50'}"
      >
        <span aria-hidden="true" class="grid size-8 shrink-0 place-items-center rounded-md border border-border text-muted-foreground">{row.glyph}</span>
        <span class="min-w-0 flex-1 space-y-1 pt-0.5">
          <span class="block text-sm font-semibold text-foreground">{row.label}</span>
          <span class="block text-sm leading-relaxed text-muted-foreground">{row.hint}</span>
        </span>
        <span class="shrink-0 self-start pt-1">
          {#if selectedOff === row.kind}
            <span class="text-foreground" aria-hidden="true">✓</span>
          {:else}
            <kbd
              class="rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
              aria-hidden="true">{row.key}</kbd
            >
          {/if}
        </span>
      </button>
      {#if offLadderContent}
        <div class="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto pb-2 pl-12 empty:hidden">{@render offLadderContent(row.kind)}{@render landingPreview(`off:${row.kind}`)}</div>
      {/if}
    </div>
  {/each}
</div>
