<script lang="ts">
  import type { Question, SealLevel, Workbook } from '../../schema';
  import type { EngineResult, HeatCell } from '../../score-engine';
  import { sealName } from '../../score-engine';
  import { sealSwatchClass } from '../../utils/seal-color';

  // HUD v3. Reads the ONE engine result — it never
  // recomputes truth, only presents it. Two don't-know figures, both surfaced and
  // kept distinct: the FLOOR line carries its gating
  // `unknowns` inseparably ("SEAL-2 · 3 unknowns"). the PROGRESS panel shows the
  // honest grand total (`dontKnowCount`) of every admitted ignorance.
  type Props = {
    result: EngineResult | null;
    workbook: Workbook | null;
  };

  let { result, workbook }: Props = $props();

  const byId = $derived(
    new Map<string, Question>(
      (workbook?.objectives ?? []).flatMap((o) =>
        o.questions.map((q): [string, Question] => [q.id, q]),
      ),
    ),
  );

  const sealLevels = $derived<SealLevel[]>(workbook?.sealLevels ?? []);
  function objName(id: string): string {
    return workbook?.objectives.find((o) => o.id === id)?.name ?? id;
  }

  const floor = $derived(result?.overall.floor ?? null);
  const unknownCount = $derived(result?.overall.unknowns.length ?? 0);
  const dontKnowCount = $derived(result?.overall.dontKnowCount ?? 0);
  const bindingTexts = $derived(
    (result?.overall.binding ?? []).map((id) => byId.get(id)?.text ?? id),
  );

  const heatmap = $derived(result?.heatmap ?? []);
  const declaredDimensions = $derived(result?.declaredDimensions ?? []);
  const heatObjectives = $derived([...new Set(heatmap.map((c) => c.objective))]);
  function cellOf(objective: string, dimension: string): HeatCell | null {
    return heatmap.find((x) => x.objective === objective && x.dimension === dimension) ?? null;
  }
</script>

<div class="space-y-5 p-1 text-sm">
  <section>
    <h3 class="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      Overall SEAL floor
    </h3>
    {#if floor === null}
      <p class="text-2xl font-semibold text-foreground">—</p>
      <p class="text-xs text-muted-foreground">
        Not yet assessed{unknownCount > 0 ? ` · ${unknownCount} unknown${unknownCount === 1 ? '' : 's'}` : ''}
      </p>
    {:else}
      <p class="text-2xl font-semibold text-foreground">
        SEAL-{floor}{unknownCount > 0 ? ` · ${unknownCount} unknown${unknownCount === 1 ? '' : 's'}` : ''}
      </p>
      <p class="text-xs text-muted-foreground">{sealName(sealLevels, floor)}</p>
      {#if bindingTexts.length}
        <p class="mt-2 text-xs text-muted-foreground">Held down by:</p>
        <ul class="mt-1 list-disc space-y-1 pl-4 text-xs text-foreground">
          {#each bindingTexts as text (text)}
            <li>{text}</li>
          {/each}
        </ul>
      {/if}
    {/if}
  </section>

  <section>
    <h3 class="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      Sovereignty Score
    </h3>
    <p class="text-2xl font-semibold text-foreground">
      {result?.overall.score == null ? '—' : `${result.overall.score.toFixed(1)}%`}
    </p>
    <p class="text-xs text-muted-foreground">Ranks above the floor — never a substitute for it.</p>
  </section>

  {#if declaredDimensions.length > 0}
    <section>
      <h3 class="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Mini heat map
      </h3>
      {#if heatObjectives.length === 0}
        <p class="text-xs text-muted-foreground">Answer a per-dimension question to fill the grid.</p>
      {:else}
        <div class="overflow-x-auto">
          <table class="border-separate border-spacing-1 text-xs">
            <thead>
              <tr>
                <th></th>
                {#each declaredDimensions as d (d.id)}
                  <th class="px-1 font-medium text-muted-foreground" title={d.name}>
                    {d.critical ? '⚑' : ''}{d.name.slice(0, 3)}
                  </th>
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each heatObjectives as oid (oid)}
                <tr>
                  <td class="pr-2 text-right text-muted-foreground" title={objName(oid)}>{oid}</td>
                  {#each declaredDimensions as d (d.id)}
                    {@const c = cellOf(oid, d.id)}
                    <td class="text-center">
                      {#if c === null}
                        <span class="text-muted-foreground/40">·</span>
                      {:else}
                        <span
                          class="inline-block min-w-5 rounded px-0.5 text-center font-semibold {sealSwatchClass(c.seal)}"
                          title={c.strata.length > 0 ? `SEAL-${c.seal} · split into strata` : `SEAL-${c.seal}`}
                        >{c.seal}{c.strata.length > 0 ? '◢' : ''}</span>
                      {/if}
                    </td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </section>
  {/if}

  <section>
    <h3 class="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      Progress
    </h3>
    <p class="text-foreground">
      {(result?.units.total ?? 0) - (result?.units.unanswered ?? 0)} of {result?.units.total ?? 0} units placed
    </p>
    <p class="text-xs text-muted-foreground">{dontKnowCount} marked don't-know</p>
  </section>
</div>
