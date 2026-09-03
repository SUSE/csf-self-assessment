<script lang="ts">
  import { optionName } from '../../merge';
  import { Button } from '../button';

  // One boolean narrowing, drawn in the SAME vocabulary as a selected option:
  // transparent at rest, accent fill when pressed. It is deliberately a `ghost`
  // and not an `outline` button — outline carries its own fill, and in dark mode
  // an accent fill over that fill is invisible, so a pressed switch looked
  // exactly like an idle one. These are not actions; they change what is listed,
  // so they must read as state, not as buttons.
  //
  // The count is what pressing it would leave, and a switch that would leave
  // nothing is disabled on the same rule as an option: dead ends are
  // unpressable, but never the one you are standing on.
  type Props = { label: string; count: number; on: boolean; onToggle: () => void };
  let { label, count, on, onToggle }: Props = $props();
</script>

<Button
  variant="ghost"
  size="sm"
  aria-label={optionName(label, count)}
  aria-pressed={on}
  disabled={count === 0 && !on}
  class={on ? 'bg-accent text-xs font-medium text-foreground' : 'text-xs text-muted-foreground'}
  onclick={onToggle}
>
  {label}
  <span class="ml-1.5 tabular-nums text-muted-foreground">{count}</span>
</Button>
