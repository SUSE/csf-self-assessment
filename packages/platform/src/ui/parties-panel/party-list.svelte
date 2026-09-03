<script lang="ts">
  import type { Answer, Claim, Party, Workbook } from '../../schema';
  import { partyAnswered, partyClaimed } from '../../assessment';
  import { buttonVariants } from '../button';
  import { Inset, Panel, PanelHeader, eyebrowVariants } from '../panel';
  import Plus from '@lucide/svelte/icons/plus';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Trash2 from '@lucide/svelte/icons/trash-2';

  // The participant's providers as an author-style list (delivery §2.6.5,
  // ADR-0007) — the twin of the claim list: a titled card with a "+ Party" action,
  // the seeded providers shown read-only, then one row per provider the participant
  // added — its type, what it serves, an edit and a remove. Adding or editing opens
  // the party editor (the app swaps the stage, exactly as it does for claims). A
  // provider a claim names can't be removed (partyClaimed), so the claim log never
  // points at a party that no longer exists.
  type Props = {
    workbook: Workbook;
    parties: Party[]; // seeded providers + the assessed party — read-only (shared ids)
    partiesAdded: Party[]; // this participant's own additions — edit / remove
    claims: Claim[]; // a provider named by any claim can't be removed (invariant #3)
    answers: Answer[];
    onAdd: () => void;
    onEdit: (id: string) => void;
    onRemove: (id: string) => void;
  };
  let { workbook, parties, partiesAdded, claims, answers, onAdd, onEdit, onRemove }: Props = $props();

  function typeName(party: Party): string {
    return workbook.parties.find((pt) => pt.id === party.type)?.name ?? party.type;
  }
  function isAssessed(party: Party): boolean {
    return workbook.parties.find((pt) => pt.id === party.type)?.kind === 'assessed';
  }
  function servedNames(party: Party): string[] {
    return party.serves.map((id) => workbook.dimensions.find((d) => d.id === id)?.name ?? id);
  }
  function subtitle(party: Party): string {
    const served = servedNames(party);
    return served.length > 0 ? `${typeName(party)} · serves ${served.join(', ')}` : typeName(party);
  }
</script>

<Panel as="div" density="lg" class="space-y-4">
  <PanelHeader title="Parties" tone="eyebrow" level={2}>
    {#snippet actions()}
      <button class={buttonVariants({ variant: 'outline', size: 'sm' })} onclick={onAdd}>
        <Plus class="mr-1 size-4" /> Party
      </button>
    {/snippet}
  </PanelHeader>
  <p class="text-sm text-muted-foreground">
    The providers behind your claims. The estate and the providers the workshop
    seeded are read-only; add your own, then claim them under Questions.
  </p>

  <!-- Seeded providers — read-only. -->
  {#if parties.length > 0}
    <div class="space-y-2">
      <p class={eyebrowVariants({ weight: 'medium' })}>Seeded</p>
      <ul class="space-y-2">
        {#each parties as party (party.id)}
          <Inset as="li" density="sm" class="flex items-center gap-3 rounded-md">
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-foreground">{party.name}</p>
              <p class="truncate text-xs text-muted-foreground">{subtitle(party)}</p>
            </div>
            <span class="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
              {isAssessed(party) ? 'Assessed' : 'Seeded'}
            </span>
          </Inset>
        {/each}
      </ul>
    </div>
  {/if}

  <!-- Added by you — editable rows; adding/editing opens the party editor. -->
  <div class="space-y-2">
    <p class={eyebrowVariants({ weight: 'medium' })}>Added by you</p>
    {#if partiesAdded.length === 0}
      <Panel as="div" tone="empty" density="none" class="px-4 py-8 text-center">
        <p class="text-sm text-muted-foreground">No providers added yet.</p>
        <button class="{buttonVariants({ variant: 'outline', size: 'sm' })} mt-3" onclick={onAdd}>
          <Plus class="mr-1 size-4" /> Add your first party
        </button>
      </Panel>
    {:else}
      <ul class="space-y-2">
        {#each partiesAdded as p (p.id)}
          {@const claimed = partyClaimed(claims, p.id)}
          {@const answered = partyAnswered(answers, p.id)}
          <Inset as="li" density="sm" class="flex items-center gap-3 rounded-md transition-colors hover:bg-accent/40">
            <button type="button" class="min-w-0 flex-1 text-left" onclick={() => onEdit(p.id)}>
              <p class="truncate text-sm font-medium text-foreground">{p.name}</p>
              <p class="truncate text-xs text-muted-foreground">{subtitle(p)}</p>
            </button>
            <button
              type="button"
              aria-label="Edit party"
              class="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
              onclick={() => onEdit(p.id)}
            >
              <Pencil class="size-4" />
            </button>
            <button
              type="button"
              aria-label="Remove party"
              disabled={claimed || answered}
              title={claimed ? 'Named by a claim — remove it from your claims first.' : answered ? 'You’ve answered a question about it — clear that answer first.' : 'Remove party'}
              class="shrink-0 text-muted-foreground transition-colors hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-muted-foreground"
              onclick={() => onRemove(p.id)}
            >
              <Trash2 class="size-4" />
            </button>
          </Inset>
        {/each}
      </ul>
    {/if}
  </div>
</Panel>
