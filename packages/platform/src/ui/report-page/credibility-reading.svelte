<script lang="ts">
  import type { CredibilityTile } from '../../analytics';
  import { CredibilityBody } from '../dashboard';

  // The document takes the figure and not the frame (report.md §3.3). `@container`
  // is the one thing the frame still owed it: without it the body's `@xl` split
  // never resolves and the print column stacks with a void beside each half.
  type Props = { model: CredibilityTile };
  let { model }: Props = $props();
</script>

<div data-report-figure class="@container">
  <CredibilityBody view={model} />
</div>
