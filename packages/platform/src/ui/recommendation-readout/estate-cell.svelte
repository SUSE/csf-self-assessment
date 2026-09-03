<script lang="ts">
  // One test estate's hearing: the estate, and how many of the authored offers it
  // would be shown. Internal to recommendation-readout.
  //
  // These were full-width rows with the count pushed to the far edge, which at a
  // wide viewport left ~1700px between an estate's name and its own number — a
  // pair the eye cannot read as a pair. As cells in a wrapping row they sit three
  // abreast when there is room and stack when there isn't, and the count never
  // leaves its name.
  type Props = {
    estateId: string;
    name: string;
    fired: number;
    catalogue: number;
  };
  let { estateId, name, fired, catalogue }: Props = $props();
</script>

<li
  data-readout-estate={estateId}
  class="flex min-w-0 max-w-sm grow basis-[15rem] items-baseline justify-between gap-3 border-b border-border/60 pb-1.5 text-sm text-foreground"
>
  <span class="min-w-0">{name}</span>
  <span class="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
    {fired} of {catalogue}
  </span>
</li>
