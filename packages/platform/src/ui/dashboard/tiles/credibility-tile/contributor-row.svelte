<script lang="ts">
  import { contributorPress } from './contributor-press.svelte';
  import type { ContributorRow } from './contributor-rows';

  // One legend line: the slice's swatch, the name, the count. The bar this used to
  // carry is now the arc beside it, so a contributor costs one line rather than
  // three and the whole roster reads at a glance.
  //
  // Colour is never the only carrier (product accessibility rule): the line prints
  // its own count, and legend order is slice order clockwise from twelve.
  //
  // This line is the accessible control for its slice — the arc is a second hit
  // area on the same press. Where no session runs it is plain text, never a control
  // that no-ops.
  let { row, ink }: { row: ContributorRow; ink: string } = $props();

  const press = contributorPress(() => row);
</script>

{#snippet body()}
  <span
    data-contributor-swatch={row.key}
    class={`size-2 shrink-0 translate-y-[-1px] rounded-full bg-current ${ink}`}></span>
  <span
    class={`min-w-0 flex-1 truncate text-left text-xs ${row.folded ? 'text-muted-foreground' : 'text-card-foreground'}`}
    title={row.label}>{row.label}</span>
  <span class="shrink-0 text-xs text-muted-foreground tabular-nums">{row.units}</span>
{/snippet}

<li data-contributor={row.key}>
  {#if press.pressable}
    <button
      type="button"
      data-contributor-press={row.key}
      aria-pressed={press.showing}
      title={`Answers standing because ${row.label} placed them`}
      onclick={press.press}
      class={`flex w-full cursor-pointer items-baseline gap-1.5 rounded-sm px-1 py-0.5 -mx-1 focus-visible:outline-2 focus-visible:outline-foreground ${
        press.showing ? 'bg-muted' : 'hover:bg-muted'
      }`}>
      {@render body()}
    </button>
  {:else}
    <span class="flex items-baseline gap-1.5 px-1 py-0.5">{@render body()}</span>
  {/if}
</li>
