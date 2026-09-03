<script lang="ts">
  import type { Seal } from '../../schema';
  import { sealSwatchClass } from '../../utils/seal-color';
  import { Input } from '../forms';
  import { Panel } from '../panel';

  type Props = {
    seal: Seal;            // the placed rung — labels "Recorded: SEAL-x" and drives the §4.5 nudge (seal >= 3)
    levelName: string;     // the SEAL level's name, for "Recorded: SEAL-x · <name>"
    evidence: string;      // the group claim's current note ('' when none); the STORED value — drives the nudge
    onEvidence: (note: string) => void;   // set the whole-group evidence (question-fill wires it to setEvidence)
  };
  let { seal, levelName, evidence, onEvidence }: Props = $props();

  const CHIPS = ['Contract clause', 'Audit report', 'Registry extract', 'Ticket–PR', 'Exit rehearsal'];
</script>

<Panel as="div" tone="quiet" class="space-y-3">
  <div class="flex items-center gap-2.5">
    <span
      class="grid size-7 shrink-0 place-items-center rounded-md text-sm font-semibold {sealSwatchClass(seal)}"
      aria-hidden="true">{seal}</span>
    <span class="text-sm font-medium text-foreground">Recorded: SEAL-{seal} · {levelName}</span>
  </div>

  <div class="space-y-1.5">
    <p class="text-sm text-muted-foreground">What backs this up?</p>
    <div class="flex flex-wrap gap-1.5">
      {#each CHIPS as chip (chip)}
        <button
          type="button"
          class="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          onclick={() => onEvidence(chip)}
        >{chip}</button>
      {/each}
    </div>
  </div>

  <Input
    density="compact"
    placeholder="A document name and a date…"
    aria-label="Evidence"
    value={evidence}
    oninput={(e) => onEvidence(e.currentTarget.value)}
  />

  {#if seal >= 3 && evidence.trim() === ''}
    <p class="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-foreground">
      High claim, no evidence — a SEAL-{seal} claim carries better with one line: a document name and a date.
    </p>
  {/if}
</Panel>
