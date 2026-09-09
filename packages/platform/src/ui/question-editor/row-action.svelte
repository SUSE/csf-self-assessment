<script lang="ts">
  import type { Component } from 'svelte';
  import { Button } from '../button';
  import { cn } from '../../utils/cn';

  // A rung row's controls: quiet at rest, surfacing with the row (the card's
  // Quiet-Until-Asked rule).
  type Props = {
    icon: Component;
    label: string;
    title: string;
    disabled?: boolean;
    onclick: () => void;
  };
  let { icon: Icon, label, title, disabled = false, onclick }: Props = $props();
</script>

<Button
  variant="ghost"
  size="icon-xs"
  class={cn(
    'text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100',
  )}
  {disabled}
  aria-label={label}
  {title}
  {onclick}
><Icon /></Button>
