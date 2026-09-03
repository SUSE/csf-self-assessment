<script lang="ts">
  import type { Recommendation } from '../../schema';
  import { Chip } from '../chip';

  // What a recommendation is, in two chips: the horizon it claims and the SEAL
  // it fires at or below. Rendered wherever a recommendation is named — the
  // catalogue row, a link entry, the link picker — so the same offer reads the
  // same way everywhere. The horizon chip is a fixed width so a column of them
  // lines up.
  type Props = {
    recommendation: Recommendation;
    /** The SEAL level's own name, from the workbook's sealLevels. */
    sealName: string;
  };
  let { recommendation, sealName }: Props = $props();
</script>

<Chip
  size="sm"
  tone={recommendation.horizon === 'renewal' ? 'strong' : 'neutral'}
  class="w-20 justify-center"
>
  {recommendation.horizon}
</Chip>
<Chip
  size="sm"
  tone="mono"
  title={`Fires at or below SEAL-${recommendation.whenAtOrBelow}${sealName === '' ? '' : ` · ${sealName}`}`}
>
  ≤ SEAL-{recommendation.whenAtOrBelow}
</Chip>
