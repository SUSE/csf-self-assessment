<script lang="ts" module>
  // Who the base was read against: a count and its population, one pip each. Below
  // two there is no population to see and above CAP the pips stop being countable,
  // so the numeral carries it alone. Structural, so no hue — the wheels' two inks.
  const CAP = 12;

  const TONE = {
    ink: 'bg-axis-ink',
    soft: 'bg-axis-ink-soft',
  } as const;
</script>

<script lang="ts">
  let {
    label,
    count,
    tone = 'soft',
    ...rest
  }: {
    /** The whole reading as one string — `5 parties`, `2 contributors`. */
    label: string;
    count: number;
    tone?: keyof typeof TONE;
    [attr: string]: unknown;
  } = $props();

  const pips = $derived(count > 1 && count <= CAP ? Array.from({ length: count }, (_, i) => i) : []);
</script>

<div class="flex flex-col gap-1.5">
  <!-- Attributes land on the reading, not the box: the acceptance scripts read
       this text exactly, and the pips beside it would pad it with whitespace. -->
  <span {...rest} class="text-sm tabular-nums text-card-foreground">{label}</span>
  {#if pips.length > 0}
    <span aria-hidden="true" class="flex h-2 items-center gap-[3px]">
      {#each pips as pip (pip)}
        <span class={`block size-2 rounded-[2px] ${TONE[tone]}`}></span>
      {/each}
    </span>
  {/if}
</div>
