<script lang="ts">
  import type { PartyType } from '../../schema';
  import { Chip } from '../chip';

  // A party type NAMING its kind — the workbook's single-assessed-party invariant,
  // said in one vocabulary wherever the taxonomy is shown. Both types name
  // themselves so the column reads as one graded set (a chip on one row and nothing
  // on the others reads as a badge, not as a kind), and the assessed party is the
  // authoritative one of that set, which is what `strong` means.
  //
  // The engine reads the typed `kind`, never a magic id, and so does this: the
  // assessed party is whichever type says it is.
  type Props = {
    kind: PartyType['kind'];
  };
  let { kind }: Props = $props();

  const assessed = $derived(kind === 'assessed');
</script>

<Chip tone={assessed ? 'strong' : 'neutral'}>{assessed ? 'assessed party' : 'third party'}</Chip>
