<script lang="ts">
  import { getHelp } from './help.svelte';

  // A finding's citation into the Rulebook: the rule the check enforces, one click
  // away. Three overview panels cite a rule (floor gates §6, coverage and wording
  // checks §7), so the affordance is one component.
  
  // It renders NOTHING when the reader's rulebook holds no such card — the same
  // vocabulary as an omitted handler, in preference to a control that opens an
  // empty panel. That is also how it stays silent in an app with no help system at
  // all: no session, no citation, no prop for four intermediate components to
  // forward.
  type Props = {
    /** A rule card id — '6', '7', 'role'.*/
    section: string;
  };
  let { section }: Props = $props();

  const help = getHelp();
</script>

{#if help?.has(section)}
  <!-- Full ink, not `text-primary`: under SUSE that token is the brand green,
     which is the SEAL hue and barred as body text. -->
  <button
    type="button"
    class="rounded border border-border px-1 font-mono text-3xs text-foreground hover:border-foreground/60 hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    title={`Open §${section} in the Rulebook`}
    onclick={() => help.cite(section)}
  >§{section}</button>
{/if}
