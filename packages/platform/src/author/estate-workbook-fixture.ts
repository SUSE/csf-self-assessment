import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { WorkbookSchema } from '../schema';
import type { Workbook } from '../schema';

/** The shipped instrument (`assessment/workbook.json`), parsed. Test-only:
 *  reads the repo with `node:fs`, so it is never imported by runtime or app
 *  code and never re-exported from a barrel. Successor to the retired
 *  `score-engine/audit-fixture.ts` — see ADR-0026. */
export function estateWorkbook(): Workbook {
  return WorkbookSchema.parse(
    JSON.parse(
      readFileSync(fileURLToPath(new URL('../../../../assessment/workbook.json', import.meta.url)), 'utf8'),
    ),
  );
}
