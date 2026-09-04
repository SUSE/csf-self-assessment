<script lang="ts">
  import type { DetailGroup, RecordRef } from '../../merge';
  import { recordRefKey, sameRecordRef } from '../../merge';
  import { Input } from '../forms';
  import { Panel, eyebrowVariants } from '../panel';

  // The sticky navigator over one Landing's affected records (landing-history §4.5):
  // Parties, then the objectives in workbook order, then the agreements — with a
  // search over the same records the changes column shows. Selecting an entry is the
  // shell's business. this reports it and marks what is current.
  type Props = {
    groups: DetailGroup[];
    shown: number;
    total: number;
    query: string;
    selected: RecordRef | null;
    onQuery: (value: string) => void;
    onSelect: (ref: RecordRef) => void;
  };
  let { groups, shown, total, query, selected, onQuery, onSelect }: Props = $props();
</script>

<!-- A Panel (ui/panel), not a bare column: it sits directly on the canvas beside
     the changes column, and a sticky navigator with no surface of its own scrolled
     content straight through it. `density="sm"` because every row inside is one
     line. Nothing here may be a Well — `--well` steps away from `--card`, and this
     panel IS the card. -->
<Panel
  as="nav"
  density="sm"
  class="max-h-[60vh] space-y-2 overflow-y-auto md:sticky md:top-0"
  data-affected-nav
  aria-label="Affected records"
>
  <h4 class={eyebrowVariants({ weight: 'medium' })}>Affected records</h4>
  <!-- The `forms` primitive rather than a hand-rolled input: it is the control
     the rest of the merge surface uses, and it carries the focus ring. -->
  <Input
    density="compact"
    aria-label="Search affected records"
    placeholder="Search affected records…"
    value={query}
    oninput={(event) => onQuery(event.currentTarget.value)}
  />
  <p class="text-xs text-muted-foreground" data-nav-count>{shown} of {total} affected records</p>
  {#each groups as group (group.id)}
    <section class="space-y-1">
      <h5 class="text-xs font-medium text-foreground">{group.label} ({group.panels.length})</h5>
      <ul class="space-y-0.5">
        {#each group.panels as panel (recordRefKey(panel.ref))}
          <li>
            <button
              class="w-full rounded px-2 py-1 text-left text-xs text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring aria-[current=true]:bg-muted aria-[current=true]:text-foreground"
              data-nav-entry={recordRefKey(panel.ref)}
              aria-current={selected !== null && sameRecordRef(selected, panel.ref)
                ? 'true'
                : undefined}
              onclick={() => onSelect(panel.ref)}
            >
              {panel.label}
            </button>
          </li>
        {/each}
      </ul>
    </section>
  {/each}
</Panel>
