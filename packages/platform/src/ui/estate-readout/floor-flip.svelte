<script lang="ts">
  import type { EstateFloorFlip } from '../../author';

  // "A change that flips a profile's floor announces itself". One
  // markup path, not one per direction: the tone is a derived class, because a
  // rise and a fall are the same sentence about the same estate.
  type Props = {
    flip: EstateFloorFlip;
  };
  let { flip }: Props = $props();

  const fmt = (floor: number | null): string => (floor === null ? '—' : `SEAL-${floor}`);
  // A new floor where there was none, or a higher one. `null` → a floor is a
  // gain: the estate can now be read at all.
  const improved = $derived(flip.from === null || (flip.to !== null && flip.to > flip.from));
</script>

<p
  role="status"
  class="rounded px-2 py-1 text-xs font-medium {improved
    ? 'bg-accent text-foreground'
    : 'bg-destructive/15 text-destructive-ink'}"
>
  {flip.name} floor: {fmt(flip.from)} → {fmt(flip.to)}
</p>
