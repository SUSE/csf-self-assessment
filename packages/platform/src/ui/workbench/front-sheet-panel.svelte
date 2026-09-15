<script lang="ts">
  import type { Workbook } from '../../schema';
  import { setFrontSheet } from '../../author';
  import { Panel, PanelHeader } from '../panel';
  import { Textarea } from '../forms';

  // The workbench's Front sheet focus: the opening page participants read. It
  // holds NO edit logic — the pure op builds the next draft from the lines the
  // textarea yields (trimmed, blanks dropped).
  type Props = {
    draft: Workbook;
    onDraft: (next: Workbook) => void;
  };
  let { draft, onDraft }: Props = $props();
</script>

<!-- The front sheet is a page of prose, not a field: the panel claims the
     stage's remaining height and the textarea takes whatever is left of
     it, so the whole sheet is readable without scrolling a 5-row box. -->
<Panel class="flex min-h-[calc(100vh-13rem)] flex-col gap-2">
  <PanelHeader title="Front sheet" />
  <p class="text-xs text-muted-foreground">
    The opening page participants read before they answer anything. Each
    line below becomes one paragraph there — press Enter for a new one,
    blank lines are dropped. Say what the instrument is, how answering
    works, that “don't know” is honest, the SEAL ceiling you expect, and
    what to bring to the session.
  </p>
  <Textarea
    aria-label="Front sheet lines"
    class="w-full flex-1 resize-none p-2 leading-relaxed"
    value={draft.frontSheet.join('\n')}
    onchange={(e) =>
      onDraft(
        setFrontSheet(
          draft,
          e.currentTarget.value
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l.length > 0),
        ),
      )}
  />
</Panel>
