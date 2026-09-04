<script lang="ts">
  // One end of the bipartite map: a dot and its label, outside the column on the
  // side its gutter is. The label is elided by the model. `title` is the full name.
  type Props = {
    nodeKey: string;
    x: number;
    y: number;
    r: number;
    label: string;
    title: string;
    side: 'left' | 'right';
    ink: string;
    seal?: number | null;
    selected?: boolean;
  };
  let { nodeKey, x, y, r, label, title, side, ink, seal = null, selected = false }: Props = $props();
</script>

<circle
  data-exposure-node={nodeKey}
  data-seal={seal ?? undefined}
  data-selected={selected ? 'true' : undefined}
  cx={x}
  cy={y}
  {r}
  fill="currentColor"
  class={ink} />
<text
  x={side === 'left' ? x - 6 : x + 6}
  y={y}
  text-anchor={side === 'left' ? 'end' : 'start'}
  dominant-baseline="middle"
  font-size="6"
  class="fill-muted-foreground">{label}<title>{title}</title></text>
