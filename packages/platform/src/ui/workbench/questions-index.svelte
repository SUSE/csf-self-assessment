<script lang="ts">
  import type { Workbook } from '../../schema';
  import { estateAnswers } from '../../author';
  import { SegmentedNav, type SegmentedItem } from '../segmented-nav';
  import { QuestionList } from '../workbook-facts';

  // The Author's Questions focus: every question the workbook asks, in reading
  // order, each row opening its editor. The list itself is the facilitator's
  // (ui/workbook-facts' QuestionList), so the two readers see one page.
  //
  // What the author adds is the SEAL column's source. The facilitator's rows carry
  // the lowest SEAL a loaded assessment selects; the author has no assessment, but
  // it does have TEST ESTATES — sparse per-question answers authored as the QA rig.
  // Pick one and its answers drive the same badge, so a question's wording can be
  // read beside what it scores. `estateAnswers` expands the sparse rows into real
  // Answer rows over the estate's own parties — the same expansion the QA dashboard
  // evaluates — so nothing here computes a seal itself.
  //
  // No estate picked is the resting state, and it renders NO badge at all rather
  // than a column of dashes: a seal has to name the reading it comes from, and this
  // page's job is authoring navigation first. (QuestionList's `answers` being empty
  // is what suppresses the badge — the same three-state rule the facilitator uses.)
  type Props = {
    draft: Workbook;
    onOpenQuestion: (id: string) => void;
  };
  let { draft, onOpenQuestion }: Props = $props();

  const NONE = 'none';
  let estateId = $state(NONE);

  const items = $derived<SegmentedItem[]>([
    { id: NONE, label: 'None' },
    ...draft.testEstates.map((e) => ({ id: e.id, label: e.name, title: e.description })),
  ]);

  // A removed or renamed estate falls back to None rather than reading as picked.
  const estate = $derived(draft.testEstates.find((e) => e.id === estateId) ?? null);
  const answers = $derived(estate ? estateAnswers(draft, estate) : []);
</script>

<div class="space-y-4">
  {#if draft.testEstates.length > 0}
    <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
      <p class="text-sm text-muted-foreground">Show the SEALs answered by a test estate</p>
      <SegmentedNav
        {items}
        active={estate?.id ?? NONE}
        onSelect={(id) => (estateId = id)}
        label="Test estate"
      />
    </div>
  {/if}

  <QuestionList
    workbook={draft}
    parties={estate?.parties ?? []}
    {answers}
    onSelect={onOpenQuestion}
  />
</div>
