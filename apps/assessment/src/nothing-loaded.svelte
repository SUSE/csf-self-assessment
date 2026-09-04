<script lang="ts">
  import { buttonVariants } from '@csf/platform/ui/button';

  // Says what each artifact DOES rather than naming modes, because the file you open
  // is the only thing that chooses a persona.
  type Props = {
    onLoad: () => void;
  };
  let { onLoad }: Props = $props();
</script>

<h2 class="text-lg font-semibold text-foreground">Nothing loaded</h2>
<p class="text-sm text-muted-foreground">
  <strong>Load</strong> a workbook to prepare it for an estate — you'll open the
  facilitator stage to seed parties, export a workbook-assessment, and land
  returned partials. Or load a <strong>workbook-assessment</strong> to fill it in
  as a participant (a saved assessment resumes where you left off). The file you
  open decides which flow you're in.
</p>
<button class={buttonVariants({ variant: 'default' })} onclick={onLoad}>Load</button>
