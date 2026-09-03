<script lang="ts">
  import type { ObjectivesTile } from '../../analytics';
  import { ObjectivesRing } from '../dashboard';
  import ObjectivesTable from './objectives-table.svelte';

  type Props = { model: ObjectivesTile };
  let { model }: Props = $props();
</script>

<p class="text-sm text-card-foreground">{model.headline}</p>
<figure data-report-figure>
  <ObjectivesRing arcs={model.arcs} rungs={model.rungs} />
</figure>
<ObjectivesTable arcs={model.arcs} />
<p class="text-xs text-muted-foreground">{model.caption}</p>
