<script lang="ts">
  import type { ZodIssue } from 'zod';
  import { cn } from '../../utils/cn';

  // The strict-validation messages a section owns. This exact five-line block —
  // `<ul data-issue class="space-y-0.5 text-xs text-destructive-ink">` over one `<li>`
  // per message — was written out ten times across the workbench, the editors and
  // both panels. It renders nothing when there is nothing wrong, so a caller can
  // place it unconditionally.
  
  // Scoping stays with the caller: only the section knows which issue paths are
  // its own, and a section that shows an issue it doesn't own sends the author
  // to the wrong control.
  type Props = { issues: ZodIssue[]; class?: string };
  let { issues, class: className }: Props = $props();
</script>

{#if issues.length > 0}
  <ul data-issue class={cn('space-y-0.5 text-xs text-destructive-ink', className)}>
    {#each issues as issue, i (i)}<li>{issue.message}</li>{/each}
  </ul>
{/if}
