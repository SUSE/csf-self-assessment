<script lang="ts">
  import type { ExposureMapView } from '../../../../analytics';
  import { sealInkClass } from '../../../../utils/seal-color';
  import ExposureNode from './exposure-node.svelte';

  // The bipartite party ↔ dimension map, hand-drawn from the geometry the model
  // computed (ADR-0013). Nothing is laid out here and no truth is looked up.
  //
  // Everything in an SVG scales with the box, labels included, so the drawing is
  // capped: past this width the type reads as a headline instead of a label.
  let { map, selected }: { map: ExposureMapView; selected: string | null } = $props();
</script>

<svg data-exposure-map viewBox={`0 0 ${map.width} ${map.height}`} class="mx-auto w-full max-w-[46rem]">
  {#each map.links as link (link.key)}
    <line
      data-exposure-link={link.key}
      data-seal={link.seal ?? undefined}
      data-selected={selected === `party:${link.party}` ? 'true' : undefined}
      x1={link.x1}
      y1={link.y1}
      x2={link.x2}
      y2={link.y2}
      stroke="currentColor"
      class={link.seal !== null
        ? sealInkClass(link.seal)
        : 'text-muted-foreground [stroke-dasharray:2_2]'} />
  {/each}
  {#each map.parties as node (node.key)}
    <ExposureNode
      nodeKey={`party:${node.key}`}
      x={node.x}
      y={node.y}
      r={2.5}
      label={node.label}
      title={node.title}
      side="left"
      ink={node.seal !== null ? sealInkClass(node.seal) : 'text-muted-foreground'}
      seal={node.seal}
      selected={selected === `party:${node.key}`} />
  {/each}
  {#each map.dimensions as node (node.key)}
    <ExposureNode
      nodeKey={`dimension:${node.key}`}
      x={node.x}
      y={node.y}
      r={node.critical ? 3 : 2}
      label={node.critical ? `⚑ ${node.label}` : node.label}
      title={node.title}
      side="right"
      ink="text-muted-foreground" />
  {/each}
</svg>
