<script lang="ts">
  import type { Answer, Party, Workbook } from '../../schema';
  import type { WalkSection } from '../../assessment';
  import { carousel, SLIDE_MS } from '../motion';
  import QuestionFill from './question-fill.svelte';
  import StageNav from './stage-nav.svelte';

  // The participant's filling UI, redesigned to a SINGLE-FOCUS stage
  // (the workbench stage-header concept): a StageNav (SOV selector + question
  // slider + Prev/Next) drives which ONE question is shown, so the participant
  // navigates instead of scrolling every card. The walk is the active claim's
  // `sections`, already narrowed to the claimed units (each
  // dimension question carries a claim-narrowed appliesTo) — the participant
  // answers only what the claim covers, in workbook order. a finalized or the
  // Author Preview passes the full walk. CONTROLLED: the parent owns the focused
  // question (`focusId` in /
  // `onFocus` out) as well as the answers, so browser Back can retrace navigation.
  type Props = {
    workbook: Workbook;
    parties: Party[];
    answers: Answer[];
    sections: WalkSection[];
    focusId: string | null;
    onChange: (answers: Answer[]) => void;
    onFocus: (id: string) => void;
    /** Render the built-in StageNav. False when the host (the assessment app)
lifts the SOV/question navigation into its own toolbar.*/
    showNav?: boolean;
  };
  let { workbook, parties, answers, sections, focusId, onChange, onFocus, showNav = true }: Props = $props();

  const allQuestions = $derived(sections.flatMap((s) => s.questions));
  const firstId = $derived(allQuestions[0]?.id ?? null);

  // A stale id after a workbook swap self-heals: resolvedId falls back to the
  // first question, so Preview's answer reset and a fresh load never leave the
  // stage pointing at nothing.
  const resolvedId = $derived(
    focusId !== null && allQuestions.some((q) => q.id === focusId) ? focusId : firstId,
  );
  const current = $derived(allQuestions.find((q) => q.id === resolvedId) ?? null);

  // -- carousel navigation -------------------------------------------------
  // Moving forward (to a higher question index — Next, a slider jump forward, or
  // an auto-advance) slides the incoming card in from the RIGHT while the old
  // leaves left. moving back slides in from the LEFT while the old leaves right —
  // a slideshow. `slideDir` is +1 forward, -1 back, set on every navigation
  // BEFORE focus changes so the {#key} block reads the right direction.
  let slideDir = $state(1);

  function indexOf(id: string | null): number {
    return id === null ? -1 : allQuestions.findIndex((q) => q.id === id);
  }

  function navigate(id: string): void {
    // Set the carousel direction BEFORE bubbling: the parent updates `focusId`,
    // which flows back into the {#key} block, and it must read the right dir.
    slideDir = indexOf(id) < indexOf(resolvedId) ? -1 : 1;
    onFocus(id);
  }

  function advance(): void {
    const i = indexOf(resolvedId);
    const next = i === -1 ? undefined : allQuestions[i + 1];
    if (next) navigate(next.id);
  }

  // The carousel slide + reduced-motion gate are shared with the workbench (see
  // ../motion). The entering card gets `slideDir` (forward → from the right),
  // the leaving card `-slideDir`.
  let reduceMotion = $state(false);
  $effect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduceMotion = mq.matches;
    const sync = (): void => {
      reduceMotion = mq.matches;
    };
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  });
  const slideMs = $derived(reduceMotion ? 0 : SLIDE_MS);
</script>

{#if current && resolvedId !== null}
  {#if showNav}
    <StageNav {workbook} {parties} {answers} {sections} focusId={resolvedId} onFocus={navigate} />
  {/if}
  <div class="grid overflow-x-clip">
    {#key resolvedId}
      <section
        class="col-start-1 row-start-1 space-y-3"
        in:carousel={{ dir: slideDir, duration: slideMs }}
        out:carousel={{ dir: -slideDir, duration: slideMs }}
      >
        <QuestionFill {workbook} {parties} question={current} {answers} onChange={onChange} onNext={advance} />
      </section>
    {/key}
  </div>
{:else}
  <p class="text-sm text-muted-foreground">This workbook has no questions to answer.</p>
{/if}
