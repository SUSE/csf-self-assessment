<script lang="ts">
  // One slice of the band. A minimum width keeps a single admission visible without
  // letting it read as more of the base than it is.
  let {
    kind,
    paint,
    share,
  }: {
    kind: 'gating' | 'others';
    paint: string;
    /** 0–1 of the base.*/
    share: number;
  } = $props();
</script>

<span
  data-admission-slice={kind}
  class={`block min-w-0.5 ${paint}`}
  style={`width: ${share * 100}%`}></span>
