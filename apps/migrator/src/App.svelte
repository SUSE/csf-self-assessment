<script lang="ts">
  import {
    migrateV1ToV2,
    WorkbookSchema,
    WorkbookAssessmentSchema,
    AssessmentSchema,
    type MigrationSuccess,
  } from '@csf/platform';
  import { AppShell } from '@csf/platform/ui/app-shell';
  import Upload from '@lucide/svelte/icons/upload';
  import Download from '@lucide/svelte/icons/download';
  import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
  import AlertCircle from '@lucide/svelte/icons/alert-circle';
  import FileText from '@lucide/svelte/icons/file-text';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import RefreshCw from '@lucide/svelte/icons/refresh-cw';

  let fileName = $state<string>('');
  let fileSize = $state<number>(0);
  let error = $state<string | null>(null);
  let successResult = $state<MigrationSuccess | null>(null);
  let validationResult = $state<{ valid: boolean; message?: string | undefined } | null>(null);
  let isDragging = $state(false);

  function resetState() {
    fileName = '';
    fileSize = 0;
    error = null;
    successResult = null;
    validationResult = null;
  }

  function processFile(file: File) {
    resetState();
    fileName = file.name;
    fileSize = file.size;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text !== 'string') {
        error = 'Failed to read file content.';
        return;
      }

      const res = migrateV1ToV2(text);
      if (!res.ok) {
        error = res.error;
        return;
      }

      successResult = res;

      // Validate against canonical v2 schema
      if (res.stats.detectedType === 'workbook') {
        const check = WorkbookSchema.safeParse(res.migrated);
        validationResult = {
          valid: check.success,
          message: check.success ? undefined : check.error.issues[0]?.message ?? 'Schema validation failed',
        };
      } else if (res.stats.detectedType === 'workbook-assessment') {
        const check = WorkbookAssessmentSchema.safeParse(res.migrated);
        validationResult = {
          valid: check.success,
          message: check.success ? undefined : check.error.issues[0]?.message ?? 'Schema validation failed',
        };
      } else if (res.stats.detectedType === 'assessment') {
        const check = AssessmentSchema.safeParse(res.migrated);
        validationResult = {
          valid: check.success,
          message: check.success ? undefined : check.error.issues[0]?.message ?? 'Schema validation failed',
        };
      } else {
        validationResult = { valid: false, message: 'Unrecognized file schema' };
      }
    };
    reader.onerror = () => {
      error = 'Error reading file.';
    };
    reader.readAsText(file);
  }

  function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      processFile(input.files[0]);
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    isDragging = true;
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
  }

  function downloadMigrated() {
    if (!successResult) return;
    const jsonStr = JSON.stringify(successResult.migrated, null, 2) + '\n';
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const outName = fileName.endsWith('.json')
      ? fileName.replace(/\.json$/, '.migrated.json')
      : `${fileName}.migrated.json`;
    a.href = url;
    a.download = outName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
</script>

<AppShell title="Migrator">
  {#snippet actions()}
    <span class="rounded bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">v1 grain → v2 scope</span>
  {/snippet}

  <div class="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center p-6 py-12">
    {#if !successResult && !error}
      <!-- Upload Dropzone -->
      <div
        class="relative flex w-full max-w-xl flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center transition-all {isDragging
          ? 'border-primary bg-primary/5 scale-[1.01]'
          : 'border-border bg-card hover:border-primary/50'}"
        ondragover={handleDragOver}
        ondragleave={handleDragLeave}
        ondrop={handleDrop}
        role="region"
        aria-label="File upload dropzone"
      >
        <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Upload class="h-6 w-6" />
        </div>
        <h2 class="mb-1 text-lg font-medium">Select a CSF JSON file to migrate</h2>
        <p class="mb-6 text-sm text-muted-foreground max-w-sm">
          Drag and drop any workbook, workbook-assessment, or assessment file, or browse from your computer.
        </p>

        <label
          class="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow hover:opacity-90 active:scale-[0.98] transition-all"
        >
          <FileText class="h-4 w-4" />
          Choose JSON File
          <input type="file" accept=".json,application/json" class="hidden" onchange={handleFileSelect} />
        </label>
      </div>
    {:else if error}
      <!-- Error Card -->
      <div class="w-full max-w-xl rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-foreground shadow-sm">
        <div class="flex items-start gap-3">
          <AlertCircle class="h-6 w-6 shrink-0 text-destructive mt-0.5" />
          <div class="flex-1">
            <h2 class="text-base font-semibold text-destructive">Migration Failed</h2>
            <p class="mt-1 text-sm text-muted-foreground">{error}</p>
            <div class="mt-4">
              <button
                type="button"
                onclick={resetState}
                class="inline-flex items-center gap-2 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-secondary/80"
              >
                <RefreshCw class="h-3.5 w-3.5" /> Try Another File
              </button>
            </div>
          </div>
        </div>
      </div>
    {:else if successResult}
      <!-- Success / Results Card -->
      <div class="w-full max-w-xl rounded-xl border border-border bg-card p-6 shadow-sm space-y-6">
        <div class="flex items-center justify-between border-b border-border pb-4">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText class="h-5 w-5" />
            </div>
            <div>
              <h2 class="text-base font-semibold">{fileName}</h2>
              <p class="text-xs text-muted-foreground">{(fileSize / 1024).toFixed(1)} KB · {successResult.stats.detectedType}</p>
            </div>
          </div>
          <div class="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
            <span class="text-muted-foreground">{successResult.stats.fromVersion}</span>
            <ArrowRight class="h-3 w-3 text-muted-foreground" />
            <span class="text-primary font-semibold">{successResult.stats.toVersion}</span>
          </div>
        </div>

        <!-- Summary Stats Grid -->
        <div class="grid grid-cols-2 gap-4">
          <div class="rounded-lg border border-border bg-muted/30 p-3">
            <span class="text-xs text-muted-foreground">Questions Migrated</span>
            <p class="text-xl font-semibold mt-0.5">{successResult.stats.questionsMigrated}</p>
          </div>
          <div class="rounded-lg border border-border bg-muted/30 p-3">
            <span class="text-xs text-muted-foreground">Clashes Updated</span>
            <p class="text-xl font-semibold mt-0.5">{successResult.stats.clashesUpdated}</p>
          </div>
        </div>

        <!-- Canonical Schema Validation Badge -->
        <div class="rounded-lg border p-3 flex items-start gap-2.5 {validationResult?.valid ? 'border-primary/20 bg-primary/5 text-foreground' : 'border-destructive/30 bg-destructive/5 text-foreground'}">
          {#if validationResult?.valid}
            <CheckCircle2 class="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p class="text-sm font-medium">Canonical v2 Validation Passed</p>
              <p class="text-xs text-muted-foreground">The migrated output conforms strictly to canonical {successResult.stats.detectedType} schema.</p>
            </div>
          {:else}
            <AlertCircle class="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p class="text-sm font-medium text-destructive">Target Schema Warning</p>
              <p class="text-xs text-muted-foreground">{validationResult?.message}</p>
            </div>
          {/if}
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center justify-between pt-2">
          <button
            type="button"
            onclick={resetState}
            class="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium"
          >
            <RefreshCw class="h-3.5 w-3.5" /> Migrate another
          </button>
          <button
            type="button"
            onclick={downloadMigrated}
            class="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:opacity-90 active:scale-[0.98] transition-all"
          >
            <Download class="h-4 w-4" /> Download Migrated File
          </button>
        </div>
      </div>
    {/if}
  </div>
</AppShell>
