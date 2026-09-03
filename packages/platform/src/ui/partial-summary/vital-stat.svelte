<script lang="ts">
  import type { ShareFill } from '../../utils/seal-color';
  import RatioBar from '../dashboard/ratio-bar.svelte';

  // One figure of the slice's health, drawn rather than sentenced: a reading over
  // the dashboard's own track-and-fill bar. Three of these wrap in the rail.
  type Props = {
    label: string;
    value: string;
    caption: string;
    fraction: number;
    fill?: ShareFill;
  };
  let { label, value, caption, fraction, fill = 'ink' }: Props = $props();
</script>

<div class="min-w-24 flex-1">
  <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
    {label}
  </p>
  <p class="mt-0.5 text-xl font-semibold leading-none text-foreground">{value}</p>
  <RatioBar {fraction} {fill} class="mt-1.5" />
  <p class="mt-1 text-xs text-muted-foreground">{caption}</p>
</div>
