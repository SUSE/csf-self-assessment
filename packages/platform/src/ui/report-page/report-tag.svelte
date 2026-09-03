<script lang="ts">
  import type { ReportTag } from '../../report';
  import { sealSwatchClass } from '../../utils/seal-color';
  import { tagAccent } from './tag-accent';

  // The printed cross-reference: paper has no links, so the badge IS the handle —
  // the reader searches the PDF for the token and lands on every appendix question
  // the list covers.
  //
  // Colour is the theme's own: a climb tag names a floor, so it wears that floor on
  // the SEAL ramp; every other family takes its slot of the tag plane (ui/theme.css).
  let { tag }: { tag: ReportTag } = $props();

  const skin = $derived(
    tag.seal === null ? tagAccent(tag) : `border-transparent ${sealSwatchClass(tag.seal)}`,
  );
</script>

<span
  data-report-tag={tag.key}
  class={`inline-block rounded-full border px-2 py-px align-baseline font-mono text-2xs tracking-tight whitespace-nowrap ${skin}`}>
  {tag.label}
</span>
