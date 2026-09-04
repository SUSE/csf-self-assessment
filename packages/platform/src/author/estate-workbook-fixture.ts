import { workbookRaw } from '../test-fixtures';
import { WorkbookSchema } from '../schema';
import type { Workbook } from '../schema';

export function estateWorkbook(): Workbook {
  return WorkbookSchema.parse(workbookRaw);
}
