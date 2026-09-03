<script module lang="ts">
  // Per-instance counter for auto-generated ids, so the <label> points at its
  // input and aria-describedby can name the help/error line. Module-scoped so
  // ids stay unique across every field on the page.
  let uid = 0;
</script>

<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';
  import { cn } from '../../utils/cn';
  import Input from './input.svelte';
  import type { InputDensity } from './variants';

  // The standard form field: a label, an input, and one line of help or
  // validation text beneath the input and aligned to it. Both apps compose this
  // instead of hand-rolling label + input + <p> — that is what kept the help
  // text drifting out of alignment. `required` marks the label (asterisk) and
  // the control; `readonly` renders a read-only input (muted, still selectable —
  // see theme.css). Passing `error` flips the field to its invalid state: the
  // input outlines red and `error` replaces `help` in destructive text.
  type Props = Omit<HTMLInputAttributes, 'required' | 'readonly'> & {
    label: string;
    help?: string;
    error?: string;
    required?: boolean;
    readonly?: boolean;
    density?: InputDensity;
    value?: string;
    id?: string;
    class?: string;
  };

  let {
    label,
    help,
    error,
    required = false,
    readonly = false,
    density = 'default',
    value = $bindable(''),
    id,
    class: className,
    ...rest
  }: Props = $props();

  // Bump the counter once at init for a stable fallback id; a caller-supplied
  // `id` overrides it (and tracks it reactively).
  const generatedId = `csf-field-${(uid += 1)}`;
  const fieldId = $derived(id ?? generatedId);
  const message = $derived(error ?? help);
  const labelClass = $derived(
    density === 'compact'
      ? 'text-xs text-muted-foreground'
      : 'text-sm font-medium text-foreground',
  );
</script>

<div class={cn('space-y-1', className)}>
  <label for={fieldId} class={cn('block', labelClass)}>
    {label}{#if required}<span class="text-destructive"> *</span>{/if}
  </label>
  <Input
    id={fieldId}
    bind:value
    {density}
    {required}
    {readonly}
    invalid={error != null}
    aria-invalid={error != null ? 'true' : undefined}
    aria-required={required || undefined}
    aria-describedby={message ? `${fieldId}-msg` : undefined}
    {...rest}
  />
  {#if message}
    <p
      id={`${fieldId}-msg`}
      class={cn('text-xs', error != null ? 'text-destructive' : 'text-muted-foreground')}
    >
      {message}
    </p>
  {/if}
</div>
