<script lang="ts" module>
  import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
  import { cn, type WithElementRef } from '../../utils/cn';
  import { buttonVariants, type ButtonSize, type ButtonVariant } from './variants';

  // Renders an <a> when `href` is set, a <button> otherwise — so a link styled
  // as a button stays a link for assistive tech and middle-click. Declared in
  // the module script so the barrel can re-export the type.
  export type ButtonProps = WithElementRef<HTMLButtonAttributes> &
    WithElementRef<HTMLAnchorAttributes> & {
      variant?: ButtonVariant;
      size?: ButtonSize;
    };
</script>

<script lang="ts">
  let {
    class: className,
    variant = 'default',
    size = 'default',
    ref = $bindable(null),
    href = undefined,
    type = 'button',
    disabled,
    children,
    ...rest
  }: ButtonProps = $props();
</script>

{#if href}
  <a
    bind:this={ref}
    data-slot="button"
    class={cn(buttonVariants({ variant, size }), className)}
    href={disabled ? undefined : href}
    aria-disabled={disabled}
    role={disabled ? 'link' : undefined}
    tabindex={disabled ? -1 : undefined}
    {...rest}
  >
    {@render children?.()}
  </a>
{:else}
  <button
    bind:this={ref}
    data-slot="button"
    class={cn(buttonVariants({ variant, size }), className)}
    {type}
    {disabled}
    {...rest}
  >
    {@render children?.()}
  </button>
{/if}
