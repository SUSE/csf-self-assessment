<script lang="ts" module>
  // One cell per unit in scope, the open ones carrying `--warning` — a
  // population mark, not a proportion bar. Why a field, why amber, why
  // `bg-border`, and the CAP fallback: DESIGN.md, "The Unit Field".
  const CAP = 240;

  export function fieldDrawable(total: number): boolean {
    return total > 0 && total <= CAP;
  }
</script>

<script lang="ts">
  let {
    total,
    open,
    class: className = '',
    ...rest
  }: {
    total: number;
    /** Open units. Drawn as the tail of the population, matching `ratio-bar`'s
     * `align="end"`: what is left sits after what is done.*/
    open: number;
    class?: string;
    [attr: string]: unknown;
  } = $props();

  const answered = $derived(Math.max(0, Math.min(total, total - open)));
  const cells = $derived(
    Array.from({ length: Math.max(0, total) }, (_, i) => i >= answered),
  );
</script>

<!-- Decorative: the count beside it is the carrier, so a reader on a screen
     reader hears the reading once rather than sixty-seven times. -->
<span
  {...rest}
  aria-hidden="true"
  class={`flex flex-wrap content-start gap-[3px] ${className}`}>
  {#each cells as isOpen, i (i)}
    <span class={`block h-2 w-2 rounded-[2px] ${isOpen ? 'bg-warning' : 'bg-border'}`}></span>
  {/each}
</span>
