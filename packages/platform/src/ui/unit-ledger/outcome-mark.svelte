<script lang="ts">
  import type { AnswerSnapshot, Question } from '../../schema';
  import { sealOfAnswer } from '../../assessment';
  import { cn } from '../../utils/cn';
  import { ReadingMark } from '../seal-badge';

  // What a record left STANDING, on the shared reading mark (ReadingMark) so the
  // ledger's chip column is the same vocabulary as the rails. `null` is a record that
  // emptied the unit — nothing stands, so a bare muted dash.
  //
  // A superseded mark fades rather than changing colour: the chip column is what gets
  // scanned, so the record that STANDS has to be the strong one, and dimming keeps the
  // ramp's order intact where a recolour would break it.
  type Props = { answer: AnswerSnapshot | null; question: Pick<Question, 'ladder'>; current?: boolean };
  let { answer, question, current = false }: Props = $props();

  const fade = $derived(current ? undefined : 'opacity-55');
</script>

{#if answer === null}
  <span
    class={cn(
      'grid size-6 shrink-0 place-items-center rounded bg-muted text-xs font-semibold text-muted-foreground',
      fade,
    )}
    title="Nothing stands here"
    aria-label="Nothing stands here">–</span>
{:else}
  <ReadingMark
    state={answer.state}
    seal={sealOfAnswer(question, answer)}
    class={fade} />
{/if}
