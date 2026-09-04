<script lang="ts">
  import type { Question, Seal } from '../../schema';
  import { cn } from '../../utils/cn';
  import { SealBadge } from '../seal-badge';

  // One question in a read-only list: its text, what it is asked about, and — when
  // an assessment is loaded — the lowest SEAL selected against it.
  
  // `seal` has THREE states, deliberately: omit it and no badge renders at all (no
  // assessment loaded — a row of en-dashes reads as broken). `null` renders the
  // badge's own "not answered" dash, which is a real fact about a loaded assessment.
  // a rank renders that rank.
  
  // With `onSelect` the row is the control that opens the question. without one it
  // is plain — the vocabulary for a reader with nowhere to go. One markup path
  // either way (a spread), because a conditional `onclick` on a static element is
  // what the a11y pass catches and two branches are the same markup twice.
  
  // `scope` names what the row is a row ABOUT, and defaults to the question's own
  // reach (`3 dim`, `party`). A caller listing UNITS rather than questions passes
  // its own — the dashboard's what's-left ledger says `Security lead · Storage ·
  // chips`, because there the same question appears once per open unit and the
  // reach is not what tells them apart.
  
  // Badge, question and scope share one 24px line box (`size-6` / `leading-6`), so
  // the row aligns by construction rather than by an `mt-*` nudge tuned to one size.
  
  // A row has NO box at rest — no border, no fill. Thirty-five filled boxes inside a
  // panel is a card in a card, and it is the boxes, not the type, that make the list
  // unreadable. Rest state is bare text. hover and selection are the only things that
  // draw a shape (the Quiet-Until-Asked Rule).
  
  // The text fills its column and the scope sits at its right edge. The MEASURE is
  // the column's job (question-list caps it), not the row's — the row has to work at
  // whatever width a wrapping column or a dashboard tile hands it.
  type Props = {
    question: Question;
    seal?: Seal | null | undefined;
    selected?: boolean;
    onSelect?: ((id: string) => void) | undefined;
    /** Override the derived reach — for a row standing for one unit of the question.*/
    scope?: string | undefined;
  };
  let { question, seal, selected = false, onSelect, scope: scopeOverride }: Props = $props();

  const scope = $derived(
    scopeOverride ??
      (question.grain === 'dimension' ? `${question.appliesTo.length} dim` : question.axis),
  );

  const interactive = $derived(
    onSelect
      ? {
          type: 'button' as const,
          'aria-pressed': selected,
          onclick: () => onSelect(question.id),
        }
      : {},
  );

  // ONE state utility per element: the rest state is the else-branch of the same
  // ternary, never a base class a later one is expected to beat. Rest is nothing.
  const stateClass = $derived(
    !onSelect
      ? ''
      : selected
        ? 'bg-accent ring-1 ring-inset ring-border'
        : 'hover:bg-accent/60',
  );
</script>

<!-- Below 24rem of row (the right rail) the scope drops under the question instead of
     taking half a line each: the text is the reading, and the scope is its label. -->
<li class="@container">
  <svelte:element
    this={onSelect ? 'button' : 'div'}
    data-question={question.id}
    {...interactive}
    class={cn(
      'flex w-full flex-col gap-0.5 rounded-md border border-transparent px-2 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring @sm:flex-row @sm:items-start @sm:gap-3',
      stateClass,
    )}
  >
    <span class="flex min-w-0 flex-1 items-start gap-3">
      {#if seal !== undefined}
        <SealBadge {seal} />
      {/if}
      <span
        class={cn(
          'min-w-0 flex-1 text-pretty text-sm leading-6',
          question.text ? 'text-foreground' : 'italic text-muted-foreground',
        )}>{question.text || '(untitled question)'}</span
      >
    </span>
    <span
      data-question-scope
      class="shrink-0 text-xs font-medium uppercase leading-6 tracking-wide tabular-nums text-muted-foreground"
      >{scope}</span
    >
  </svelte:element>
</li>
