<script lang="ts">
  import type { NavGroup, NavQuestion, NavTone } from './types';
  import { NAV_TONE_LABEL } from './variants';
  import NavTick from './nav-tick.svelte';

  type Props = {
    groups: NavGroup[];
    useGreen?: boolean;
  };
  let { groups, useGreen = false }: Props = $props();

  const toneOrder: NavTone[] = ['done', 'partial', 'none', 'na', 'flag'];
  const questions = $derived<NavQuestion[]>(groups.flatMap((group) => group.questions));
  const tones = $derived<NavTone[]>(
    toneOrder.filter((tone) => questions.some((question) => question.tone === tone)),
  );
  const dontKnowSample = $derived(questions.find((question) => question.notch));
  const naSample = $derived(questions.find((question) => question.naMark));
</script>

{#if tones.length > 0 || dontKnowSample || naSample}
  <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
    <span class="sr-only">Question status key:</span>
    {#each tones as tone (tone)}
      {@const sample = questions.find((question) => question.tone === tone)}
      <span class="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <NavTick
          {tone}
          fraction={sample?.fraction ?? 0}
          {useGreen}
          size="mini"
          label=""
        />
        <span>{NAV_TONE_LABEL[tone]}</span>
      </span>
    {/each}
    {#if dontKnowSample}
      <span class="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <NavTick
          tone={dontKnowSample.tone}
          fraction={dontKnowSample.fraction}
          notch
          {useGreen}
          size="mini"
          label=""
        />
        <span>includes don’t-know</span>
      </span>
    {/if}
    {#if naSample}
      <span class="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <NavTick
          tone={naSample.tone}
          fraction={naSample.fraction}
          naMark
          {useGreen}
          size="mini"
          label=""
        />
        <span>includes doesn’t-apply</span>
      </span>
    {/if}
  </div>
{/if}
