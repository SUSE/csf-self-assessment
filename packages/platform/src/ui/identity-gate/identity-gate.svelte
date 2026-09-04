<script lang="ts">
  import type { Participant, WorkbookAssessment } from '../../schema';
  import { TextField } from '../forms';

  // The identity prompt: a participant who opened a
  // workbook-assessment declares who they are — just their name (roles retired,
  // ). It lives inline on the Overview page, not a wizard step: there is
  // no "start" button. entering a name (Enter or blur) declares you and opens the
  // Claims and Questions sections. Claims are composed next, in their own section.
  type Props = {
    workbookAssessment: WorkbookAssessment;
    onDeclare: (participant: Participant) => void;
  };
  let { workbookAssessment, onDeclare }: Props = $props();

  let name = $state('');

  function commit(): void {
    const trimmed = name.trim();
    if (trimmed) onDeclare({ name: trimmed });
  }
</script>

<div class="space-y-4">
  <div class="space-y-1">
    <h2 class="text-lg font-semibold text-foreground">Who are you?</h2>
    <p class="text-sm text-muted-foreground">
      {workbookAssessment.meta.estate} · {workbookAssessment.workbook.dimensions.length}
      dimension{workbookAssessment.workbook.dimensions.length === 1 ? '' : 's'} in scope.
    </p>
  </div>

  <form onsubmit={(e) => { e.preventDefault(); commit(); }}>
    <TextField
      label="Your name"
      placeholder="e.g. Alice"
      help="Press Enter to begin — the Claims and Questions sections open once you do."
      bind:value={name}
      onblur={commit}
    />
  </form>
</div>
