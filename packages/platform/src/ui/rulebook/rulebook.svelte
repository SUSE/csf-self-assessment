<script lang="ts">
  import { flip } from 'svelte/animate';
  import { cubicOut } from 'svelte/easing';
  import { prefersReducedMotion } from 'svelte/motion';
  import { cn } from '../../utils/cn';
  import { SLIDE_MS } from '../motion';
  import RuleCard from './rule-card.svelte';
  import type { RuleSection } from './content';

  // The rule list: whichever audience's cards were handed in, in authored order,
  // except that the governed section BUBBLES to the top rather than the list
  // scrolling down to it — so the rest of the screen never shifts and only one
  // card moves. animate:flip does the travel.
  
  // Presentational: it takes its cards and its promoted id as props and reads no
  // context. RulebookPanel is the piece that knows about the help session.
  type Props = {
    /** The reader's rule set (AUTHOR_RULES, PARTICIPANT_RULES, …).*/
    sections: RuleSection[];
    /** The rule section to promote to the top, e.g. '3.2'. Null = reading order.*/
    activeSection?: string | null;
    class?: string;
  };
  let { sections, activeSection = null, class: className }: Props = $props();

  // Reading order, but the governed section jumps to the front. The others keep
  // their sequence, so the list stays legible and only one card moves.
  const ordered = $derived.by<RuleSection[]>(() => {
    const hit = activeSection ? sections.find((s) => s.id === activeSection) : undefined;
    if (!hit) return sections;
    return [hit, ...sections.filter((s) => s.id !== hit.id)];
  });

  const flipMs = $derived(prefersReducedMotion.current ? 0 : SLIDE_MS);

  // Bring the freshly-promoted card into view: the promoted section is always
  // first, so returning the list's own scroll to the top reveals it — never a
  // page jump, never a scrollIntoView that pushes the editor off screen.
  let scroller = $state<HTMLElement | null>(null);
  $effect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- read activeSection to track it as an effect dependency
    activeSection;
    scroller?.scrollTo({
      top: 0,
      behavior: prefersReducedMotion.current ? 'auto' : 'smooth',
    });
  });
</script>

<ul
  bind:this={scroller}
  class={cn('-mr-1 min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden pr-1', className)}
>
  {#each ordered as section (section.id)}
    <li animate:flip={{ duration: flipMs, easing: cubicOut }}>
      <RuleCard {section} promoted={section.id === activeSection} />
    </li>
  {/each}
</ul>
