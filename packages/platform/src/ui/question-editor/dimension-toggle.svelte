<script lang="ts">
  import { chipVariants } from '../chip';
  import { cn } from '../../utils/cn';

  // One dimension in "Applies to": the authoring twin of the participant's
  // placement tray, and therefore in the tray's position — above the ladder, in the
  // left column, where the fill card puts the units that fan onto it.
  
  // It borrows ui/chip's pill styling but is deliberately NOT `rounded-full`:
  // DESIGN.md reserves the pill for things that MOVE (a tray chip you can pick up,
  // a landing preview), and the tray's dimension chips are exactly that — so an
  // authoring toggle wearing the same shape would promise a drag that does not
  // exist here. Structural radius, pressed state in the selection wash.
  type Props = {
    name: string;
    /** Gates the floor — the flag the chip carries everywhere else in the product.*/
    critical: boolean;
    pressed: boolean;
    onToggle: () => void;
  };
  let { name, critical, pressed, onToggle }: Props = $props();
</script>

<button
  type="button"
  aria-pressed={pressed}
  class={cn(
    chipVariants({ tone: pressed ? 'strong' : 'neutral' }),
    'cursor-pointer rounded-md px-2.5 py-1 transition-colors',
    pressed ? 'bg-accent' : 'hover:border-foreground/30 hover:text-foreground',
  )}
  onclick={onToggle}
>
  {#if critical}<span aria-hidden="true" class="text-warning-ink">⚑</span>{/if}
  {name}
</button>
