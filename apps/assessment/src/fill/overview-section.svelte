<script lang="ts">
  import type { Workbook } from '@csf/platform';
  import { DetailsCard, DetailField } from '@csf/platform/ui/details-card';
  import { TextField } from '@csf/platform/ui/forms';
  import { FrontSheet } from '@csf/platform/ui/front-sheet';
  import type { Fill } from './fill.svelte';

  // What the participant is answering, and who they are answering as. The
  // workbook-assessment card LEADS because it carries this page's one editable field.
  type Props = {
    fill: Fill;
    workbook: Workbook;
    estate: string;
  };
  let { fill, workbook, estate }: Props = $props();
</script>

<div class="space-y-6">
  <!-- Only when this run came from a prepared package. -->
  {#if fill.workbookAssessmentId !== null}
    {@const waId = fill.workbookAssessmentId}
    <DetailsCard title="Workbook assessment">
      {#snippet fields()}
        <!-- Mirrored to the model on every keystroke; blank is fine until export. -->
        {#if fill.participant !== null}
          {@const participant = fill.participant}
          <TextField
            class="grow"
            density="compact"
            label="your name"
            placeholder="e.g. Alice"
            help="Optional while you work — required only to export your partial."
            bind:value={participant.name}
          />
        {/if}
        <DetailField label="id" value={waId} mono />
        <DetailField label="estate" value={estate} grow />
      {/snippet}
    </DetailsCard>
  {/if}

  <!-- The instrument, read-only, its front sheet held in the card footer. -->
  <DetailsCard title="Workbook">
    {#snippet fields()}
      <DetailField label="id" value={workbook.meta.id} mono />
      <DetailField label="version" value={workbook.meta.version} mono />
      <DetailField label="title" value={workbook.meta.title} grow />
    {/snippet}
    {#snippet footer()}
      <FrontSheet lines={workbook.frontSheet} />
    {/snippet}
  </DetailsCard>
</div>
