<script lang="ts" module>
  import type { Snippet } from 'svelte';
  import { Input } from '../forms';

  // The closing beat of a decision, on both merge queues: what was decided, and
  // the free-text reason that goes into the ledger beside it.
  
  // One component rather than two copies, because the clash queue and the party
  // queue are worked in the same sitting and gate the same Land button — if the
  // two closings drift, the reader has to learn the surface twice.
  export type DecisionNoteProps = {
    /** The chosen option's label, or `null` while the decision is still open.*/
    decided: string | null;
    /** Shown instead of the decided line while open — the clash queue's
     * "Suggested — … · Accept" control. The party axis has no suggestion and
     * passes nothing.*/
    pending?: Snippet;
    /** Accessible name for the note field: it has no visible label, because the
     * placeholder already says what it is and a second line of chrome under a
     * decision reads as a form.*/
    noteLabel: string;
    note: string;
    onNote: (note: string) => void;
  };
</script>

<script lang="ts">
  let { decided, pending, noteLabel, note, onNote }: DecisionNoteProps = $props();
</script>

{#if decided !== null}
  <p class="text-xs text-muted-foreground" data-decided>{`decided — ${decided}`}</p>
{:else if pending}
  {@render pending()}
{/if}

<!-- Capped to a writing measure. The decision column absorbs whatever the stage
     is wider than the facts, and a note field the width of that column reads as a
     search bar. The `forms` primitive rather than a bare `<input>`: it carries the
     focus ring and the inert read-only/disabled styling theme.css owns. -->
<Input
  density="compact"
  class="max-w-lg"
  aria-label={noteLabel}
  value={note}
  placeholder="Optional note — recorded in the ledger"
  oninput={(event) => onNote(event.currentTarget.value)}
/>
