<script lang="ts">
  import { SvelteMap } from 'svelte/reactivity';
  import type { ZodIssue } from 'zod';
  import type { Workbook } from '../../schema';
  import {
    focusForIssue,
    type FocusRef,
    questionSite,
    objectiveSite,
    recommendationSite,
  } from '../workbench/focus';
  import { cn } from '../../utils/cn';
  import { eyebrowVariants } from '../panel';
  import InspectionHeader from './inspection-header.svelte';

  // Centralized inspector view listing all validation issues on the active draft
  // workbook, grouped by their target section/question with direct jump-to-editor
  // actions.
  type Props = {
    draft: Workbook | null;
    issues: ZodIssue[];
    onFocus: (focus: FocusRef) => void;
  };
  let { draft, issues, onFocus }: Props = $props();

  function getFocusLabel(focus: FocusRef): string {
    if (!draft) return 'Workbook';
    switch (focus.kind) {
      case 'overview':
        return 'Overview & weights';
      case 'frontSheet':
        return 'Front sheet';
      case 'objectives':
        return 'Objectives';
      case 'questions':
        return 'Questions';
      case 'dimensions':
        return 'Dimensions';
      case 'roles':
        return 'Roles';
      case 'parties':
        return 'Party types';
      case 'testEstates':
        return 'Test estates';
      case 'recommendations':
        return 'Recommendations';
      case 'objective': {
        const obj = objectiveSite(draft, focus.id);
        return obj ? `Objective ${obj.id} · ${obj.name || '(unnamed)'}` : `Objective: ${focus.id}`;
      }
      case 'question': {
        const site = questionSite(draft, focus.id);
        return site
          ? `${site.objective.id} · Q${site.questionIndex + 1} (${site.question.id})`
          : `Question: ${focus.id}`;
      }
      case 'recommendation': {
        const site = recommendationSite(draft, focus.id);
        return site
          ? `Recommendation: ${site.recommendation.id}`
          : `Recommendation: ${focus.id}`;
      }
    }
  }

  type IssueGroup = {
    key: string;
    focus: FocusRef;
    label: string;
    issues: ZodIssue[];
  };

  const groups = $derived.by((): IssueGroup[] => {
    if (!draft || issues.length === 0) return [];
    const map = new SvelteMap<string, IssueGroup>();

    for (const issue of issues) {
      const focus = focusForIssue(draft, issue);
      const key = 'id' in focus ? `${focus.kind}:${focus.id}` : focus.kind;
      let group = map.get(key);
      if (!group) {
        group = {
          key,
          focus,
          label: getFocusLabel(focus),
          issues: [],
        };
        map.set(key, group);
      }
      group.issues.push(issue);
    }
    return Array.from(map.values());
  });
</script>

<div class="flex h-full min-h-0 flex-col text-sm">
  <InspectionHeader
    title="Validation issues"
    count={issues.length > 0 ? `${issues.length} ${issues.length === 1 ? 'issue' : 'issues'}` : undefined}
    note="Select an issue to jump to its editor in the workbench."
  />

  <div class="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden pt-3">
    {#if issues.length === 0}
      <p class="text-xs text-muted-foreground">
        No validation issues. The workbook passes strict validation.
      </p>
    {:else}
      {#each groups as group (group.key)}
        <div class="space-y-1.5">
          <h4 class={cn(eyebrowVariants(), 'truncate text-foreground')} title={group.label}>
            {group.label}
          </h4>
          <ul class="space-y-1">
            {#each group.issues as issue, i (i)}
              <li>
                <button
                  type="button"
                  class="group flex w-full flex-col items-start rounded-md border border-destructive/25 bg-destructive/5 p-2 text-left transition-colors hover:border-destructive/50 hover:bg-destructive/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-foreground"
                  onclick={() => onFocus(group.focus)}
                >
                  <span class="text-xs font-medium text-destructive-ink group-hover:underline">
                    {issue.message}
                  </span>
                  {#if issue.path.length > 0}
                    <span class="mt-0.5 font-mono text-3xs text-muted-foreground">
                      {issue.path.join('.')}
                    </span>
                  {/if}
                </button>
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    {/if}
  </div>
</div>
