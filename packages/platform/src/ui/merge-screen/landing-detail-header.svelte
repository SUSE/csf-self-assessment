<script lang="ts">
  import type { LandingHeading, LandingNeighbors } from '../../merge';
  import { Button } from '../button';

  // The sticky header of one Landing's detail (landing-history §4.4): what was
  // landed, its short id, the facilitator's note, who landed it and when, the
  // workbook-assessment it is anchored to, and the recorded-order neighbours. The
  // vocabulary is a Landing's — never parent, commit or hash.
  type Props = {
    heading: LandingHeading;
    neighbors: LandingNeighbors;
    onBack: () => void;
    onOpenLanding: (id: string) => void;
  };
  let { heading, neighbors, onBack, onOpenLanding }: Props = $props();
</script>

<header class="sticky top-0 z-10 space-y-1 border-b border-border bg-background pb-2">
  <Button
    variant="ghost"
    size="sm"
    class="hidden md:inline-flex"
    aria-label="Landing history"
    onclick={onBack}
  >
    ← Landing history
  </Button>
  <h3 class="text-sm font-medium text-foreground break-words" data-landing-detail-title
    >{heading.title}</h3
  >
  <p class="font-mono text-xs text-muted-foreground" data-landing-detail-short>{heading.shortId}</p>
  {#if heading.note !== null}
    <p class="text-sm text-muted-foreground break-words" data-landing-detail-note>{heading.note}</p>
  {/if}
  <p class="text-xs text-muted-foreground break-words" data-landing-detail-landed
    >{heading.landedPrefix}<time datetime={heading.instant} title={heading.instant}
      >{heading.landedWhen}</time
    ></p
  >
  <p class="text-xs text-muted-foreground break-words" data-landing-detail-anchor
    >Workbook-assessment: {heading.anchor}</p
  >
  <p class="text-xs text-muted-foreground" data-landing-detail-counts
    >{heading.unitsReviewed} unit{heading.unitsReviewed === 1 ? '' : 's'} reviewed{heading.phrases
      .length === 0
      ? ''
      : ` · ${heading.phrases.join(' · ')}`}</p
  >
  <p class="flex items-center gap-2">
    {#if neighbors.previous !== null}
      {@const previous = neighbors.previous}
      <Button
        variant="outline"
        size="xs"
        data-landing-prev
        onclick={() => onOpenLanding(previous.id)}
      >
        Previous landing
      </Button>
    {/if}
    {#if neighbors.next !== null}
      {@const next = neighbors.next}
      <Button variant="outline" size="xs" data-landing-next onclick={() => onOpenLanding(next.id)}>
        Next landing
      </Button>
    {/if}
  </p>
</header>
