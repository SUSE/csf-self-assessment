<script lang="ts">
  import { sealSwatchClass } from '../../utils/seal-color';
  import type { BindingLane } from './model';

  // The maximised reading: which PART of the estate is holding the floor down.
  // One lane per estate axis (the whole estate, a named provider, a dimension or
  // one of its strata), worst rung first, with the gating questions as chips —
  // the same records the collapsed panel counts and does not list.
  type Props = { lanes: BindingLane[] };
  let { lanes }: Props = $props();
</script>

{#if lanes.length === 0}
  <p class="text-xs text-muted-foreground">
    Nothing gates the estate yet — no answer pins a floor.
  </p>
{:else}
  <ul data-floor-binding class="space-y-1">
    {#each lanes as lane (lane.key)}
      <li
        data-binding-lane={lane.key}
        class="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t border-border pt-1"
      >
        <span
          data-lane-seal={lane.worstSeal}
          class={`rounded px-1 text-xs font-semibold ${sealSwatchClass(lane.worstSeal)}`}
        >
          {lane.worstSeal}
        </span>
        <span class="text-sm text-foreground">{lane.label}</span>
        <span class="flex flex-wrap gap-1">
          {#each lane.questions as question (question.questionId)}
            <span
              class="rounded border border-border px-1.5 py-0.5 font-mono text-xs text-muted-foreground"
            >
              {question.questionId}
            </span>
          {/each}
        </span>
      </li>
    {/each}
  </ul>
{/if}
