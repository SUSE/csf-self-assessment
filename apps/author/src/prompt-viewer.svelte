<script lang="ts">
  import * as AlertDialog from '@csf/platform/ui/alert-dialog';
  import { Button } from '@csf/platform/ui/button';
  import { Textarea } from '@csf/platform/ui/forms';
  import Copy from '@lucide/svelte/icons/copy';
  import Check from '@lucide/svelte/icons/check';
  import Sparkles from '@lucide/svelte/icons/sparkles';

  type Props = {
    open: boolean;
    promptMode: 'inline' | 'attach';
    userRequirement: string;
    intro: string;
    domainText: string;
    hasDomain: boolean;
    rulesAndTemplate: string;
    copied: boolean;
    onCopy: () => void;
    onBack: () => void;
  };

  let {
    open = $bindable(false),
    promptMode,
    userRequirement = $bindable(''),
    intro,
    domainText,
    hasDomain,
    rulesAndTemplate,
    copied,
    onCopy,
    onBack,
  }: Props = $props();
</script>

<AlertDialog.Root bind:open>
  <AlertDialog.Content class="sm:max-w-5xl w-[94vw] h-[88vh] flex flex-col gap-3.5 p-6">
    <AlertDialog.Header class="flex flex-row items-center justify-between gap-4 shrink-0">
      <div class="flex items-center gap-2">
        <Sparkles class="size-5 text-primary shrink-0" />
        <div>
          <AlertDialog.Title>AI prompt workspace</AlertDialog.Title>
          <AlertDialog.Description>
            Provide your domain requirements, review the highlighted prompt, and copy it to your assistant
          </AlertDialog.Description>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="inline-flex items-center rounded-full border border-border bg-muted/60 px-2.5 py-0.5 text-2xs font-medium text-foreground">
          {promptMode === 'inline' ? 'Schema embedded' : 'Schema attached'}
        </span>
        {#if hasDomain}
          <span class="inline-flex items-center rounded-full border border-positive/40 bg-positive/15 px-2.5 py-0.5 text-2xs font-medium text-positive">
            Custom domain specified
          </span>
        {:else}
          <span class="inline-flex items-center rounded-full border border-destructive/40 bg-destructive/15 px-2.5 py-0.5 text-2xs font-medium text-destructive">
            No domain specified (placeholder)
          </span>
        {/if}
      </div>
    </AlertDialog.Header>

    <div class="flex flex-col gap-1.5 shrink-0">
      <div class="flex items-center justify-between">
        <label for="workspace-requirements" class="text-xs font-medium text-foreground">
          Domain &amp; Subject Requirements (optional)
        </label>
        <span class="text-2xs text-muted-foreground">
          Updates the highlighted domain section below in real time
        </span>
      </div>
      <Textarea
        id="workspace-requirements"
        bind:value={userRequirement}
        placeholder="e.g. Sovereign AI clusters, sovereign Kubernetes platforms, or healthcare cloud estates..."
        rows={3}
      />
    </div>

    <div class="flex flex-col gap-1.5 flex-1 min-h-0">
      <span class="text-xs font-medium text-muted-foreground shrink-0">Live Prompt Preview</span>
      <div class="flex-1 min-h-0 overflow-y-auto rounded border border-border bg-muted/30 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap select-all">
        <span>{intro}</span>{#if hasDomain}<span class="inline-block rounded border border-positive/40 bg-positive/15 px-2 py-0.5 font-semibold text-positive">{domainText}</span>{:else}<span class="inline-block rounded border border-destructive/40 bg-destructive/15 px-2 py-0.5 font-bold text-destructive">{domainText}</span>{/if}<span>{rulesAndTemplate}</span>
      </div>
    </div>

    <div class="rounded-md border border-border/60 bg-muted/20 p-2.5 text-xs text-muted-foreground shrink-0">
      <div class="font-medium text-foreground mb-0.5">Next steps:</div>
      <ol class="list-decimal list-inside space-y-0.5">
        {#if promptMode === 'inline'}
          <li>Click <strong>Copy prompt to clipboard</strong> below and paste it into your AI assistant.</li>
        {:else}
          <li>Make sure you have downloaded and attached <strong>csf-workbook.schema.json</strong>, then click <strong>Copy prompt to clipboard</strong> and paste it.</li>
        {/if}
        <li>Copy the JSON response returned by the AI.</li>
        <li>Click <strong>Import workbook</strong> in the Author toolbar to load and validate your instrument.</li>
      </ol>
    </div>

    <AlertDialog.Footer class="flex flex-row items-center justify-between sm:justify-between gap-2 pt-1 shrink-0">
      <Button variant="outline" class="gap-1.5 text-xs" onclick={onBack}>
        <span>&larr; Back to options</span>
      </Button>
      <div class="flex items-center gap-2">
        <AlertDialog.Cancel class="text-xs">Close</AlertDialog.Cancel>
        <Button variant="default" class="gap-1.5 text-xs" onclick={onCopy}>
          {#if copied}
            <Check class="size-4" />
            <span>Copied!</span>
          {:else}
            <Copy class="size-4" />
            <span>Copy prompt to clipboard</span>
          {/if}
        </Button>
      </div>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
