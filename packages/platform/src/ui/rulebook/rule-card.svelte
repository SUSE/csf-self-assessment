<script lang="ts">
  import type { RuleSection } from './content';

  // One rule, as a card. Internal to the Rulebook — extracted because it is the
  // body of a keyed each block, and because the promoted state has to be stated
  // in one place: the panel PROMOTES a card to the top rather than scrolling to
  // it, so the card that moved must also look picked or the travel reads as the
  // list reshuffling itself for no reason.
  type Props = {
    section: RuleSection;
    /** This is the card the cursor (or a citation) just asked for. */
    promoted: boolean;
  };
  let { section, promoted }: Props = $props();
</script>

<!-- Promotion is NEUTRAL: `border-foreground/50 bg-accent`, the same "this is the
     current one" vocabulary the header icons and the question nav use. It was
     `border-primary/60` with a `text-primary` tag, which under SUSE paints the
     brand green — the SEAL hue, and a fill the brand guide bars as text ink. -->
<article
  class="rounded-lg border p-3 transition-colors duration-500 {promoted
    ? 'border-foreground/50 bg-accent'
    : 'border-border bg-card'}"
>
  <div class="font-mono text-xs text-muted-foreground">{section.tag} · {section.eyebrow}</div>
  <h4 class="mt-0.5 text-sm font-semibold text-foreground">{section.title}</h4>
  {#each section.paras as para (para)}
    <p class="mt-1.5 text-xs leading-relaxed text-muted-foreground">{para}</p>
  {/each}
  {#if section.watch}
    <p
      class="mt-2 rounded border border-destructive/25 bg-destructive/10 px-2 py-1.5 text-xs leading-relaxed text-destructive-ink"
    >
      {section.watch}
    </p>
  {/if}
</article>
