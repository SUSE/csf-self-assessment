// The active workbook's whole file lifecycle (spec §3): what is loaded, what went
// wrong loading it, and the browser mirror that makes the copy in this tab the
// workbook of record (product invariant #7).
import { DraftWorkbookSchema, starterWorkbook } from '@csf/platform';
import type { Workbook } from '@csf/platform';
import { openJsonFile, saveJsonFile } from '@csf/platform/file-io';
import { authorDraft } from '@csf/platform/workbook-storage';

type Deps = {
  /** Called once a NEW workbook is the active one, so the shell can reset the
   *  session around it and make that a history baseline. */
  onAdopt: (workbook: Workbook) => void;
};

export class Draft {
  workbook = $state<Workbook | null>(authorDraft.load());
  error = $state<string | null>(null);
  #onAdopt: Deps['onAdopt'];

  constructor(deps: Deps) {
    this.#onAdopt = deps.onAdopt;
    // Best-effort mirror — a private-mode failure just degrades to memory. Created
    // here, so "every change is mirrored" holds by construction.
    $effect(() => {
      if (this.workbook) authorDraft.store(this.workbook);
    });
  }

  /** Replace the active workbook and reset the session around it. */
  adopt(workbook: Workbook): void {
    this.workbook = workbook;
    this.error = null;
    this.#onAdopt(workbook);
  }

  /** An edit from the workbench: same workbook, next value. */
  edit(next: Workbook): void {
    this.workbook = next;
  }

  /** Adopt a fresh starter workbook. */
  startFresh(): void {
    this.adopt(starterWorkbook());
  }

  async importFile(): Promise<void> {
    const opened = await openJsonFile();
    if (!opened) return;
    let data: unknown;
    try {
      data = JSON.parse(opened.text);
    } catch {
      this.error = `“${opened.name}” is not valid JSON.`;
      return;
    }
    const parsed = DraftWorkbookSchema.safeParse(data);
    if (!parsed.success) {
      this.error = `“${opened.name}” is not a workbook definition: ${parsed.error.issues[0]?.message ?? 'schema error'}.`;
      return;
    }
    this.adopt(parsed.data);
  }

  async exportFile(): Promise<void> {
    if (!this.workbook) return;
    await saveJsonFile(`${this.workbook.meta.id}-workbook.json`, this.workbook);
  }
}

export function createDraft(deps: Deps): Draft {
  return new Draft(deps);
}
