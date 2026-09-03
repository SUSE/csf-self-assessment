<script lang="ts">
  import type { ZodIssue } from 'zod';
  import type { Workbook } from '../../schema';
  import { setRecommender } from '../../author';
  import { Button } from '../button';
  import { Checkbox } from '../checkbox';
  import { Field, Input, IssueList, Textarea } from '../forms';
  import { Label } from '../label';
  import { Well, eyebrowVariants } from '../panel';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import ChevronUp from '@lucide/svelte/icons/chevron-up';
  import RecommenderContactFields from './recommender-contact-fields.svelte';

  // Who is speaking (spec §2.4, R21). Each input emits exactly ONE
  // RecommenderPatch field; the both-or-neither contact rule and the
  // drop-when-empty rule live in setRecommender, never here.
  //
  // Attribution is set once per workbook and then read, so at rest it is ONE
  // line, not four filled inputs: on the catalogue page the eleven offers are
  // the subject and this is the byline. It opens itself — and stays open — while
  // it is incomplete or carries an issue, because a byline that isn't there yet
  // is the thing to fix.
  type Props = {
    draft: Workbook;
    /** Already scoped to `['recommender']` by the caller. */
    issues: ZodIssue[];
    onDraft: (next: Workbook) => void;
  };
  let { draft, issues, onDraft }: Props = $props();

  let expanded = $state(false);

  const name = $derived(draft.recommender?.name ?? '');
  const disclosure = $derived(draft.recommender?.disclosure ?? '');
  const contactLabel = $derived(draft.recommender?.contact?.label ?? '');

  // Forced open, with no way to collapse: there is nothing to summarise, so a
  // collapse control would only hide the work.
  const pinnedOpen = $derived(issues.length > 0 || name === '' || disclosure === '');
  const open = $derived(pinnedOpen || expanded);

  const summary = $derived(
    [name, disclosure, contactLabel].filter((part) => part !== '').join(' · '),
  );

  // The contact is present or absent, so it is gated by a checkbox rather than
  // by two inputs the author is left to guess are optional. setRecommender drops
  // the key when both halves are empty, so "offering one, nothing typed yet" is
  // a state the workbook cannot hold: the intent lives here until the first
  // keystroke, and the stored contact outranks it from then on.
  let intendsContact = $state(false);
  const offersContact = $derived(draft.recommender?.contact !== undefined || intendsContact);

  function toggleContact(next: boolean): void {
    intendsContact = next;
    // Unchecking withdraws the offer: clearing both halves is what removes the
    // key, and a contact left in the workbook would still render its button.
    if (!next) onDraft(setRecommender(draft, { contactLabel: '', contactUrl: '' }));
  }
</script>

<Well as="section" density="sm" class={open ? 'space-y-2' : ''}>
  <div class="flex items-center gap-3">
    <p class={eyebrowVariants()}>Recommender</p>
    {#if !open}
      <p class="min-w-0 flex-1 truncate text-xs text-muted-foreground">{summary}</p>
    {/if}
    {#if !pinnedOpen}
      <!-- The chevron points the way the block will travel, which is the house
           rule for every collapse control in the system. -->
      <Button
        variant="outline"
        size="icon"
        class="ml-auto"
        aria-expanded={open}
        aria-label={open ? 'Collapse recommender' : 'Edit recommender'}
        title={open ? 'Hide the recommender fields' : 'Edit who is speaking'}
        onclick={() => (expanded = !expanded)}
      >{#if open}<ChevronUp class="size-4" />{:else}<ChevronDown class="size-4" />{/if}</Button>
    {/if}
  </div>

  {#if open}
    <p class="max-w-prose text-xs text-muted-foreground">
      Who is speaking. Name and disclosure are required as soon as this workbook carries a
      recommendation; the contact is an offer you may withhold — without it the page carries no
      call to action.
    </p>
    <!-- Capped measure: unbounded, the disclosure field grows to the width of
         the stage — a 1300px single-line input for one sentence. -->
    <div class="flex max-w-5xl flex-wrap items-end gap-2">
      <Field label="name" class="w-48">
        <Input
          density="compact"
          data-rule="3.8"
          placeholder="Who authored this instrument"
          value={name}
          oninput={(e) => onDraft(setRecommender(draft, { name: e.currentTarget.value }))}
        />
      </Field>
      <!-- basis-full: the disclosure is prose, not a field in the row, so it
           takes its own line at the full measure rather than a 64px-basis slot
           that grows and shrinks against the controls beside it. -->
      <Field label="disclosure" class="min-w-0 basis-full">
        <Textarea
          density="compact"
          data-rule="3.8"
          rows={2}
          placeholder="What they authored, and what they sell"
          value={disclosure}
          oninput={(e) => onDraft(setRecommender(draft, { disclosure: e.currentTarget.value }))}
        />
      </Field>
      <!-- Sits on the fields' baseline, not their captions': it is a control in
           the row, so it lines up with the inputs beside it. -->
      <Label for="recommender-contact" class="h-8 text-xs text-muted-foreground" data-rule="3.8">
        <Checkbox
          id="recommender-contact"
          checked={offersContact}
          onCheckedChange={toggleContact}
        />
        offer a contact
      </Label>
      {#if offersContact}
        <RecommenderContactFields {draft} {onDraft} />
      {/if}
    </div>
    <IssueList {issues} />
  {/if}
</Well>
