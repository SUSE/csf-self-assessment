<script lang="ts">
  // A refusal, said once — an unreadable file, an artifact the mode won't open, a
  // landing the engine refused. Renders NOTHING for a null/empty message, so a
  // caller passes its state straight in rather than wrapping this in an `{#if}`.
  type Props = {
    message?: string | null;
  };
  let { message = null }: Props = $props();
</script>

{#if message}
  <div
    role="alert"
    class="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-foreground"
  >
    {message}
  </div>
{/if}
