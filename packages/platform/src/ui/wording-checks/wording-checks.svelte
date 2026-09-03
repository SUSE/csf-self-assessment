<script lang="ts">
  import type { DuplicateWarning, QuestionLint } from '../../author';
  import { Panel, PanelHeader, Well } from '../panel';
  import { RuleCite } from '../rulebook';
  import DuplicateRow from './duplicate-row.svelte';
  import LintRow from './lint-row.svelte';
  import { checksVerdict } from './model';

  // The authoring quality bars on the Author overview (rulebook §7): the ladder
  // lint and the duplicate radar, the two readings the retired Author HUD carried
  // that live nowhere else. Both are advisory — a hedged rung is a rewrite, not a
  // validation failure, which is why they sit here and not in the issue list.
  //
  // Unlike the HUD, every id is a real navigation: a finding opens the question it
  // is about.
  //
  // Presentation only: this component counts nothing — the lint and the radar are
  // derived by the overview that hosts it.
  type Props = {
    lint: QuestionLint[];
    duplicates: DuplicateWarning[];
    onOpenQuestion: (questionId: string) => void;
  };
  let { lint, duplicates, onOpenQuestion }: Props = $props();
</script>

<Panel class="space-y-4">
  <PanelHeader title="Wording checks" tone="eyebrow" level={2}>
    {#snippet actions()}<RuleCite section="7" />{/snippet}
  </PanelHeader>

  <div class="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-xs">
    <p class="text-muted-foreground">
      A rung must be checkable, not arguable. Text signals only — whether two
      questions turn on the same fact stays your judgment.
    </p>
    <p class="text-foreground">{checksVerdict(lint, duplicates)}</p>
  </div>

  <!-- Two lists side by side on a wide stage, folding when the collapsing rails
       narrow it: sized by basis, not by a viewport breakpoint. -->
  <div class="flex flex-wrap gap-x-10 gap-y-6">
    <section class="min-w-0 grow basis-[26rem] space-y-1">
      <PanelHeader title="Ladder lint" tone="eyebrow" level={3} />
      {#if lint.length === 0}
        <Well tone="empty" density="sm">
          <p class="text-xs text-muted-foreground">No findings.</p>
        </Well>
      {:else}
        <ul class="divide-y divide-border/60 border-y border-border/60">
          {#each lint as entry (entry.questionId)}
            <LintRow {entry} {onOpenQuestion} />
          {/each}
        </ul>
      {/if}
    </section>

    <section class="min-w-0 grow basis-[20rem] space-y-1">
      <PanelHeader title="Similar pairs" tone="eyebrow" level={3} />
      {#if duplicates.length === 0}
        <Well tone="empty" density="sm">
          <p class="text-xs text-muted-foreground">No pair reads alike.</p>
        </Well>
      {:else}
        <ul class="divide-y divide-border/60 border-y border-border/60">
          {#each duplicates as pair (`${pair.aId} ${pair.bId}`)}
            <DuplicateRow {pair} {onOpenQuestion} />
          {/each}
        </ul>
      {/if}
    </section>
  </div>
</Panel>
