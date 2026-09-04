<script lang="ts">
  import * as ToggleGroup from '../toggle-group';

  // One option of a narrowing, carrying the count it would leave, so the reader
  // knows what a control does before pressing it. A zero-count option is
  // disabled — but NEVER when it is the selected one.
  type Props = { value: string; label: string; count: number; selected: boolean; name: string };
  let { value, label, count, selected, name }: Props = $props();
</script>

<ToggleGroup.Item {value} disabled={count === 0 && !selected} aria-label={name}>
  {label}
  <span class="ml-1.5 tabular-nums text-muted-foreground">{count}</span>
</ToggleGroup.Item>
