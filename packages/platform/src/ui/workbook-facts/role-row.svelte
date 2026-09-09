<script lang="ts">
  import type { RoleDef } from '../../schema';
  import { RecordRow } from '../record-table';

  // One answerer role, read-only: the code a question names, the role's name, and
  // the description a participant is shown when the role is asked of them.
  type Props = {
    role: RoleDef;
  };
  let { role }: Props = $props();
</script>

<RecordRow id={role.id}>
  <td class="truncate font-mono text-muted-foreground">{role.id}</td>
  <td class="truncate text-foreground">{role.name}</td>
  <td class="text-muted-foreground">{role.description ?? '—'}</td>
</RecordRow>
