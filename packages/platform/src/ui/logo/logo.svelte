<script lang="ts">
  import { cn } from '../../utils/cn';

  // The logo "token": a placeholder brand mark for a real logo image. It is an
  // inline SVG (no remote asset — invariant #7) whose fills read the theme
  // tokens directly (`--primary` / `--primary-foreground`), so it recolours
  // with the theme like everything else. Swap this component's markup for the
  // real logo later; the header contract (a themeable mark) stays the same.

  type Props = {
    label?: string;
    /** Hide the wordmark, showing the mark tile alone (e.g. a collapsed rail). */
    markOnly?: boolean;
    class?: string;
  };

  let { label = 'Cloud Sovereignty', markOnly = false, class: className }: Props =
    $props();
</script>

<span class={cn('inline-flex items-center gap-2.5', className)}>
  <svg
    class="size-8 shrink-0"
    viewBox="0 0 32 32"
    role="img"
    aria-label={label}
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="32" height="32" rx="8" fill="var(--primary)" />
    <g fill="var(--primary-foreground)">
      <rect x="9" y="17" width="15" height="5" rx="2.5" />
      <circle cx="13" cy="17" r="4" />
      <circle cx="18.5" cy="14.5" r="5.5" />
      <circle cx="23" cy="18" r="3.5" />
    </g>
  </svg>
  {#if !markOnly}
    <span class="text-base font-semibold leading-tight tracking-tight text-foreground">
      {label}
    </span>
  {/if}
</span>
