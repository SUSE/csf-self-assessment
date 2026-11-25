<script lang="ts">
  import type { LucideIcon } from '@lucide/svelte';
  import { Button, buttonVariants } from '@csf/platform/ui/button';
  import * as AlertDialog from '@csf/platform/ui/alert-dialog';
  import * as Tooltip from '@csf/platform/ui/tooltip';
  import { exportIssuesWarning } from '@csf/platform/ui/workbench';
  import BookOpen from '@lucide/svelte/icons/book-open';
  import FilePlus from '@lucide/svelte/icons/file-plus';
  import Download from '@lucide/svelte/icons/download';
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
  import { cn } from '$lib/utils/cn';
  import workbookSchema from '../../../tools/csf-workbook.schema.json';
  import PromptViewer from './prompt-viewer.svelte';

  // The header's file actions. New and Import both overwrite the active workbook,
  // which lives only in this browser, so with one open they are staged behind the
  // confirm below and run only on confirm. Export is staged behind a warning
  // dialog if the workbook has validation issues.
  type Props = {
    hasDraft: boolean;
    issueCount?: number;
    onNew: () => void;
    onImport: () => void | Promise<void>;
    onExport: () => void | Promise<void>;
    onReviewIssues?: () => void;
  };
  let { hasDraft, issueCount = 0, onNew, onImport, onExport, onReviewIssues }: Props = $props();

  let confirmReplaceOpen = $state(false);
  let confirmExportOpen = $state(false);
  let aiModalOpen = $state(false);
  let confirmMissingDomainOpen = $state(false);
  let viewerOpen = $state(false);
  let promptMode = $state<'inline' | 'attach'>('inline');
  let userRequirement = $state('');
  let copied = $state(false);
  let copyTimeout: ReturnType<typeof setTimeout> | null = null;
  let pendingReplace = $state<(() => void | Promise<void>) | null>(null);

  const exportWarning = $derived(exportIssuesWarning(issueCount));

  function getPromptSections(requirement: string, mode: 'inline' | 'attach') {
    const custom = requirement.trim();
    const hasDomain = custom !== '';
    const domainText = hasDomain ? custom : '[PROVIDE YOUR DOMAIN REQUIREMENTS]';

    const intro = `You are an expert Cloud Sovereignty Framework (CSF) Instrument Author.
Generate a valid, complete CSF workbook JSON document adhering strictly to schemaVersion "2.0".

## DOMAIN REQUIREMENTS:
`;

    const schemaSection = mode === 'inline'
      ? `## FORMAL JSON SCHEMA (Draft 7):
You must ensure the generated JSON document strictly validates against this standard JSON Schema:
\`\`\`json
${JSON.stringify(workbookSchema, null, 2)}
\`\`\``
      : `## FORMAL JSON SCHEMA:
A formal JSON Schema is provided in the attached "csf-workbook.schema.json" file.
You must ensure the generated JSON document strictly conforms to that schema, including all required fields and property constraints.`;

    const rulesAndTemplate = `\n\n${schemaSection}

## CORE AUTHORING RULES & INVARIANTS:
1. Every question must describe a checkable CAPABILITY UNDER STRESS (not vague policies or maturity).
   Question stems must be exactly one askable sentence.
   Each question must have an audible 'why' explanation.
2. OBJECTIVES & WEIGHT BUDGET:
   - Objective weights must sum to exactly 100 (R1).
   - Objective IDs must be unique (R2).
3. QUESTION IDS & SCOPE:
   - Question IDs must be unique across the entire workbook (R3).
   - If scope is 'dimension', 'appliesTo' must contain only valid dimension IDs declared in 'dimensions' (R6).
   - If scope is 'party', axis can be 'assessment' (asked once for the estate) or 'party' (asked per declared party).
4. LADDERS & RUNGS:
   - Ordered choices from worst to best sovereignty.
   - Rung IDs unique within each question (R5).
   - Rung points (0 to 100) must be monotonically non-decreasing (points never fall, R22).
   - Rung SEAL levels (0 to 4) must be monotonically non-decreasing (SEAL never falls, R23).
   - SEAL tags must exist in sealLevels (0, 1, 2, 3, 4) (R5).
5. ROLES:
   - Every question must name a 'role' that exists in declared 'roles' (e.g. ARCH, SEC, OPS, LEG, PROC, EXEC) (R14).
6. PARTIES:
   - Exactly ONE party type must have kind: "assessed" (e.g. institution) (R16). Other party types have kind: "third-party".
7. MATERIALITY:
   - defaultMateriality must be "material" (gates floor and scores), "ranking" (scores only, never gates floor), or "informational".

## REQUIRED JSON STRUCTURE:
Return ONLY a valid JSON object matching this schema (no markdown formatting, no commentary):
{
  "schemaVersion": "2.0",
  "meta": {
    "id": "custom-workbook",
    "version": "1.0.0",
    "title": "Custom Sovereignty Assessment"
  },
  "frontSheet": [
    "Opening declaration and context for participants."
  ],
  "sealLevels": [
    { "seal": 0, "name": "SEAL-0", "description": "Uncontrolled exposure" },
    { "seal": 1, "name": "SEAL-1", "description": "Basic procedural controls" },
    { "seal": 2, "name": "SEAL-2", "description": "Enforced technical boundaries" },
    { "seal": 3, "name": "SEAL-3", "description": "Sovereign jurisdiction and enclave" },
    { "seal": 4, "name": "SEAL-4", "description": "Full cryptographic and operational autonomy" }
  ],
  "dimensions": [
    { "id": "compute", "name": "Compute & Virtualisation", "critical": true },
    { "id": "storage", "name": "Storage & Backups", "critical": true }
  ],
  "roles": [
    { "id": "SEC", "name": "Security & Cryptography" },
    { "id": "OPS", "name": "Infrastructure Operations" },
    { "id": "ARCH", "name": "Architecture & Engineering" },
    { "id": "LEG", "name": "Legal & Compliance" }
  ],
  "parties": [
    { "id": "institution", "name": "Assessed Organisation", "kind": "assessed" },
    { "id": "provider", "name": "Primary Cloud Provider", "kind": "third-party" }
  ],
  "objectives": [
    {
      "id": "SOV-1",
      "name": "Data Control",
      "description": "Protection of assets",
      "weight": 100,
      "questions": [
        {
          "id": "SOV-1.keys",
          "scope": "dimension",
          "appliesTo": ["compute", "storage"],
          "text": "Who manages cryptographic keys?",
          "why": "Key custody determines disclosure risk.",
          "role": "SEC",
          "defaultMateriality": "material",
          "ladder": [
            { "id": "r0", "description": "Provider managed", "points": 0, "seal": 0 },
            { "id": "r1", "description": "Customer managed KMS", "points": 50, "seal": 2 },
            { "id": "r2", "description": "Dedicated customer HSM (HYOK)", "points": 100, "seal": 4 }
          ]
        }
      ]
    }
  ],
  "testEstates": [],
  "recommendations": []
}`;

    return {
      intro,
      hasDomain,
      domainText,
      rulesAndTemplate,
      fullText: `${intro}${domainText}${rulesAndTemplate}`,
    };
  }

  const promptSections = $derived(getPromptSections(userRequirement, promptMode));
  const generatedPrompt = $derived(promptSections.fullText);

  function handleCopyPrompt(): void {
    if (userRequirement.trim() === '') {
      confirmMissingDomainOpen = true;
      return;
    }
    void executeCopy();
  }

  async function executeCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      copied = true;
      if (copyTimeout) clearTimeout(copyTimeout);
      copyTimeout = setTimeout(() => {
        copied = false;
      }, 2000);
    } catch (e) {
      console.error('Failed to copy to clipboard', e);
    }
  }

  function confirmCopyMissingDomain(): void {
    confirmMissingDomainOpen = false;
    void executeCopy();
  }

  function handleDownloadSchema(): void {
    const blob = new Blob([JSON.stringify(workbookSchema, null, 2)], {
      type: 'application/schema+json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'csf-workbook.schema.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleProceedToWorkspace(): void {
    aiModalOpen = false;
    viewerOpen = true;
  }

  function handleBackToConfig(): void {
    viewerOpen = false;
    aiModalOpen = true;
  }

  function guardReplace(action: () => void | Promise<void>): void {
    if (hasDraft) {
      pendingReplace = action;
      confirmReplaceOpen = true;
    } else {
      void action();
    }
  }

  function confirmReplace(): void {
    const action = pendingReplace;
    pendingReplace = null;
    confirmReplaceOpen = false;
    void action?.();
  }

  function handleExport(): void {
    if (exportWarning !== null) {
      confirmExportOpen = true;
    } else {
      void onExport();
    }
  }

  function confirmExport(): void {
    confirmExportOpen = false;
    void onExport();
  }

  const actions = $derived<
    { label: string; Icon: LucideIcon; disabled?: boolean; onclick: () => void }[]
  >([
    { label: 'New workbook', Icon: FilePlus, onclick: () => guardReplace(onNew) },
    { label: 'Import workbook', Icon: BookOpen, onclick: () => guardReplace(onImport) },
    { label: 'AI prompt helper', Icon: Sparkles, onclick: () => { aiModalOpen = true; } },
    { label: 'Export workbook', Icon: Download, disabled: !hasDraft, onclick: handleExport },
  ]);
</script>

<Tooltip.Provider delayDuration={300}>
  {#each actions as action (action.label)}
    <Tooltip.Root>
      <Tooltip.Trigger
        class={buttonVariants({ variant: 'outline', size: 'icon' })}
        aria-label={action.label}
        disabled={action.disabled}
        onclick={action.onclick}
      >
        <action.Icon class="size-4" />
      </Tooltip.Trigger>
      <Tooltip.Content>{action.label}</Tooltip.Content>
    </Tooltip.Root>
  {/each}
</Tooltip.Provider>

<AlertDialog.Root bind:open={confirmReplaceOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Replace the current workbook?</AlertDialog.Title>
      <AlertDialog.Description>
        The workbook you're editing is stored only in this browser. Loading a new
        one overwrites it — you'll lose your current work unless you export it
        first.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action onclick={confirmReplace}>Discard &amp; continue</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<AlertDialog.Root bind:open={confirmExportOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>{exportWarning?.title ?? 'Export workbook with issues?'}</AlertDialog.Title>
      <AlertDialog.Description>
        {exportWarning?.description ?? ''}
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      {#if onReviewIssues}
        <Button
          variant="outline"
          onclick={() => {
            confirmExportOpen = false;
            onReviewIssues();
          }}
        >
          Review issues
        </Button>
      {/if}
      <AlertDialog.Action onclick={confirmExport}>
        {exportWarning?.action ?? 'Export anyway'}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<AlertDialog.Root bind:open={aiModalOpen}>
  <AlertDialog.Content class="sm:max-w-xl flex flex-col gap-4">
    <AlertDialog.Header>
      <div class="flex items-center gap-2">
        <Sparkles class="size-5 text-primary" />
        <AlertDialog.Title>AI prompt helper</AlertDialog.Title>
      </div>
      <AlertDialog.Description>
        Configure how to deliver the workbook schema, then generate your prompt
      </AlertDialog.Description>
    </AlertDialog.Header>

    <div class="flex flex-col gap-2.5">
      <span class="text-xs font-medium text-foreground">Choose prompt format</span>
      <div class="grid grid-cols-2 gap-2">
        <button
          type="button"
          class={cn(
            'flex flex-col items-start gap-1 rounded-md border p-3 text-left transition-colors cursor-pointer',
            promptMode === 'inline'
              ? 'border-primary bg-primary/10 text-foreground'
              : 'border-border bg-background hover:bg-muted/40 text-muted-foreground',
          )}
          onclick={() => { promptMode = 'inline'; }}
        >
          <span class="text-xs font-medium text-foreground">1. Embed schema in prompt</span>
          <span class="text-2xs text-muted-foreground">Self-contained prompt with full JSON schema included</span>
        </button>
        <button
          type="button"
          class={cn(
            'flex flex-col items-start gap-1 rounded-md border p-3 text-left transition-colors cursor-pointer',
            promptMode === 'attach'
              ? 'border-primary bg-primary/10 text-foreground'
              : 'border-border bg-background hover:bg-muted/40 text-muted-foreground',
          )}
          onclick={() => { promptMode = 'attach'; }}
        >
          <span class="text-xs font-medium text-foreground">2. Attach schema file</span>
          <span class="text-2xs text-muted-foreground">Shorter prompt referencing csf-workbook.schema.json</span>
        </button>
      </div>

      {#if promptMode === 'inline'}
        <div class="rounded border border-border/70 bg-muted/30 p-3 text-xs text-muted-foreground">
          <p><strong class="font-medium text-foreground">When to use:</strong> Best for web chat assistants (such as Claude, ChatGPT, or Gemini) with large context windows. Everything is in one prompt so you do not need to attach or upload separate files.</p>
        </div>
      {:else}
        <div class="flex flex-col gap-2 rounded border border-border/70 bg-muted/30 p-3 text-xs text-muted-foreground">
          <p><strong class="font-medium text-foreground">When to use:</strong> Best when uploading files to your AI chat, or when using AI developer agents that read workspace files. Keeps the prompt concise and saves prompt tokens.</p>
          <div class="flex items-center gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              class="h-7 gap-1.5 text-xs"
              onclick={handleDownloadSchema}
            >
              <Download class="size-3.5" />
              <span>Download csf-workbook.schema.json</span>
            </Button>
            <span class="text-2xs text-muted-foreground">Attach this file alongside your prompt</span>
          </div>
        </div>
      {/if}
    </div>

    <AlertDialog.Footer class="flex flex-row items-center justify-end gap-2 pt-2">
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <Button variant="default" class="gap-1.5" onclick={handleProceedToWorkspace}>
        <span>Generate prompt &rarr;</span>
      </Button>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<PromptViewer
  bind:open={viewerOpen}
  bind:userRequirement
  {promptMode}
  intro={promptSections.intro}
  domainText={promptSections.domainText}
  hasDomain={promptSections.hasDomain}
  rulesAndTemplate={promptSections.rulesAndTemplate}
  {copied}
  onCopy={handleCopyPrompt}
  onBack={handleBackToConfig}
/>

<AlertDialog.Root bind:open={confirmMissingDomainOpen}>
  <AlertDialog.Content class="max-w-md">
    <AlertDialog.Header>
      <div class="flex items-center gap-2">
        <TriangleAlert class="size-5 text-warning-ink" />
        <AlertDialog.Title>Domain requirements not specified</AlertDialog.Title>
      </div>
      <AlertDialog.Description>
        You did not enter domain requirements. The copied prompt contains placeholder text:
        <code class="my-1.5 block rounded border border-border bg-muted/60 px-2 py-1 font-mono text-2xs text-foreground">
          [PROVIDE YOUR DOMAIN REQUIREMENTS]
        </code>
        You must write your specific domain requirements in the prompt before you send it to your AI assistant.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel and enter domain</AlertDialog.Cancel>
      <AlertDialog.Action onclick={confirmCopyMissingDomain}>
        Copy anyway
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
