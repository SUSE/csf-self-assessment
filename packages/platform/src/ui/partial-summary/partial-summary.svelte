<script lang="ts">
  import type { Answer, Claim, Party, Question, Workbook } from '../../schema';
  import { bindingPotential, scopeCompleteness, sliceHygiene } from '../../assessment';
  import { sealName } from '../../score-engine';
  import { SealBadge } from '../seal-badge';
  import BindingGroup from './binding-group.svelte';
  import VitalStat from './vital-stat.svelte';

  // The participant's honest right-rail summary while filling a PARTIAL (delivery
  // §2.7.1). Replaces the estate Hud for a working file: it presents ONLY what is
  // true of a slice — scoped completeness, hygiene, and per-answer binding
  // potential — never an estate result (invariant #7). Thin: every figure comes
  // from scopeCompleteness / sliceHygiene / bindingPotential; it computes no truth.
  // Vitals are ratio bars and binding answers group by the rung they cap at, so
  // the rail reads as marks first. The headline is the WORST rung present.
  type PartialSummaryProps = {
    workbook: Workbook | null;
    parties: Party[];
    answers: Answer[];
    claims: Claim[];
    /** Given, a binding question is the control that opens it on the fill surface. */
    onOpenQuestion?: ((id: string) => void) | undefined;
  };

  let { workbook, parties, answers, claims, onOpenQuestion }: PartialSummaryProps = $props();

  const scope = $derived(workbook ? scopeCompleteness(workbook, parties, answers, claims) : null);
  const hygiene = $derived(sliceHygiene(answers));
  const binding = $derived(workbook ? bindingPotential(workbook, answers) : []);

  const questionById = $derived(
    new Map<string, Question>(
      (workbook?.objectives ?? []).flatMap((o) => o.questions.map((q): [string, Question] => [q.id, q])),
    ),
  );

  const scale = $derived(
    [...(workbook?.sealLevels ?? [])].sort((a, b) => a.seal - b.seal).map((l) => l.seal),
  );

  // Binding answers collapsed onto their rung, worst first — the same descent the
  // ladder draws, so the cap the reader cares about leads.
  const rungs = $derived(
    scale
      .map((seal) => ({
        seal,
        questions: binding
          .filter((b) => b.seal === seal)
          .map((b) => questionById.get(b.questionId))
          .filter((q): q is Question => q !== undefined),
      }))
      .filter((r) => r.questions.length > 0),
  );

  const cap = $derived(rungs.length > 0 ? rungs[0].seal : null);
  const widest = $derived(Math.max(1, ...rungs.map((r) => r.questions.length)));
</script>

<div class="flex flex-col gap-5 p-1 text-sm">
  <section class="flex flex-wrap gap-x-4 gap-y-3">
    <VitalStat
      label="Your scope"
      value={scope ? `${scope.answered} / ${scope.total}` : '—'}
      caption="answered in your claim"
      fraction={scope && scope.total > 0 ? scope.answered / scope.total : 0}
    />
    <VitalStat
      label="Evidence"
      value={`${hygiene.evidenced} / ${hygiene.answered}`}
      caption="answers carry evidence"
      fraction={hygiene.answered > 0 ? hygiene.evidenced / hygiene.answered : 0}
    />
    <VitalStat
      label="Don't-know"
      value={`${hygiene.dontKnow}`}
      caption="admitted, not guessed"
      fraction={hygiene.answered > 0 ? hygiene.dontKnow / hygiene.answered : 0}
      fill="open"
    />
  </section>

  <section>
    <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      Binding potential
    </h3>

    {#if cap === null}
      <p class="text-xs text-muted-foreground">No answers would bind the estate yet.</p>
    {:else}
      <div class="flex items-center gap-2.5 rounded-lg border border-transparent bg-muted/40 p-2.5">
        <SealBadge seal={cap} size="md" />
        <div class="min-w-0">
          <p class="text-sm font-semibold leading-tight text-foreground">
            Would cap the estate at SEAL-{cap}
          </p>
          <p class="text-xs text-muted-foreground">
            once merged · {binding.length} answer{binding.length === 1 ? '' : 's'} bind
          </p>
        </div>
      </div>

      <ul class="mt-3 flex flex-col gap-1.5">
        {#each rungs as rung, i (rung.seal)}
          <BindingGroup
            seal={rung.seal}
            name={sealName(workbook?.sealLevels ?? [], rung.seal)}
            questions={rung.questions}
            share={rung.questions.length / widest}
            open={i === 0}
            {onOpenQuestion}
          />
        {/each}
      </ul>
    {/if}
  </section>
</div>
