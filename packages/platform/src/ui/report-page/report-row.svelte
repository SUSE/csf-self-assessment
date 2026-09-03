<script lang="ts">
  import type { Seal } from '../../schema';
  import { sealInkClass } from '../../utils/seal-color';

  // One line, not three: at 131 rows a stacked block cost seven pages of a
  // twenty-four-page document. The question runs on the left, its standing on the
  // right, and the flag rides beside the standing rather than on a line of its own.
  type Props = {
    question: string;
    meta: string;
    /** Inks the meta line; null = the row has no asserted seal (a don't-know, an
     *  unanswered unit). Never rendered as SEAL-0. */
    seal: Seal | null;
    /** A short note — `evidence recorded`, `gates the floor`. */
    flag: string | null;
  };
  let { question, meta, seal, flag }: Props = $props();
</script>

<li data-report-row class="flex items-baseline gap-3 border-t border-border py-0.5">
  <p class="min-w-0 flex-1 text-sm text-card-foreground">{question}</p>
  {#if flag !== null}
    <p class="shrink-0 text-xs text-muted-foreground">{flag}</p>
  {/if}
  <p
    data-seal={seal ?? undefined}
    class={`shrink-0 text-xs ${seal === null ? 'text-muted-foreground' : sealInkClass(seal)}`}>
    {meta}
  </p>
</li>
