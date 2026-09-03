<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Answer, Party, Workbook } from '../../schema';
  import { questionCoverageDetail, type WalkSection } from '../../assessment';
  import { QuestionNav, type NavGroup, type NavTone } from '../question-nav';

  // The participant's stage navigation (addendum 3, option B): the shared
  // QuestionNav fed from the active-pass walk. Read-only — coverage only, no
  // authoring. Navigation is scoped to `sections` (the active claim's walk);
  // `workbook`/`parties`/`answers` drive each question's coverage tick. Owns no
  // state: the parent holds `focusId` and receives every move via `onFocus`.
  type Props = {
    workbook: Workbook;
    parties: Party[];
    answers: Answer[];
    sections: WalkSection[];
    focusId: string;
    onFocus: (id: string) => void;
    /** Draw the bottom separator. False when embedded in the assessment toolbar,
        where the toolbar owns the border. */
    bordered?: boolean;
    /** Leading control, before Prev — forwarded to QuestionNav's `lead`. */
    lead?: Snippet | undefined;
  };
  let {
    workbook,
    parties,
    answers,
    sections,
    focusId,
    onFocus,
    bordered = true,
    lead,
  }: Props = $props();

  // The walk as the navigator's model, plus the claim-wide answered count for the
  // summary — one pass over the same coverage rule the footer and engine use.
  const model = $derived.by(() => {
    let done = 0;
    let total = 0;
    const groups: NavGroup[] = sections.map((s) => ({
      id: s.objectiveId,
      code: s.objectiveId,
      name: s.objectiveName,
      questions: s.questions.map((q) => {
        const d = questionCoverageDetail(workbook, parties, answers, q);
        const tone: NavTone =
          d.status === 'answered'
            ? 'done'
            : d.status === 'partial'
              ? 'partial'
              : d.status === 'inapplicable'
                ? 'na'
                : 'none';
        if (d.status !== 'inapplicable') {
          total += 1;
          if (d.status === 'answered') done += 1;
        }
        return {
          id: q.id,
          text: q.text,
          tone,
          fraction: d.total > 0 ? d.placed / d.total : 0,
          // Surface a don't-know OR a doesn't-apply whether the question is
          // answered or still in progress — neither an unknown nor an exclusion is
          // silent; both are placements, so neither co-occurs with `none`.
          notch: d.hasDontKnow,
          naMark: d.hasNa,
        };
      }),
    }));
    return { groups, summary: `${done}/${total} answered` };
  });
</script>

<div class={bordered ? 'border-b border-border pb-3' : ''}>
  <QuestionNav
    groups={model.groups}
    activeId={focusId}
    onSelect={onFocus}
    summary={model.summary}
    useGreen
    showNextUnresolved
    {lead}
  />
</div>
