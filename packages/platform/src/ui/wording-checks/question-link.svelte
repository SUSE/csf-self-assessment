<script lang="ts">
  // A question id that opens its editor. Its own component because a finding names
  // one question and a similar pair names two — the same mono control three times
  // over on this panel.
  type Props = {
    questionId: string;
    onOpen: (questionId: string) => void;
  };
  let { questionId, onOpen }: Props = $props();
</script>

<button
  type="button"
  class="rounded-sm px-1 font-mono text-xs font-medium text-foreground hover:bg-well focus-visible:bg-well focus-visible:outline-none"
  title={`Open ${questionId}`}
  onclick={() => onOpen(questionId)}
>{questionId}</button>
