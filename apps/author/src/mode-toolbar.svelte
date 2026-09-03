<script lang="ts">
  import { HeaderIconButton } from '@csf/platform/ui/workbench';
  import type { AuthorMode } from '@csf/platform/ui/workbench';
  import type { ModeItem } from './modes';

  // The author's stage destinations, closing the stage header's icon row — the
  // twin of the facilitator toolbar's reporting group.
  type Props = {
    items: ModeItem[];
    active: AuthorMode;
    onSelect: (id: AuthorMode) => void;
  };
  let { items, active, onSelect }: Props = $props();
</script>

<div class="flex items-center gap-1">
  <div class="mx-1.5 h-6 w-px bg-border"></div>
  {#each items as item (item.id)}
    <HeaderIconButton
      label={item.label}
      Icon={item.Icon}
      active={active === item.id}
      disabled={item.disabled}
      onclick={() => onSelect(item.id)}
    />
  {/each}
</div>
