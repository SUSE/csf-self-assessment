// Local persistence for the Author's active workbook draft. The browser copy IS
// the active workbook: the Author writes it on every edit and restores it on
// load, so refreshing the page mid-edit never loses work. Parsed leniently
// (DraftWorkbookSchema) — the same contract as Import — so a draft saved mid-edit
// reopens even while it still fails strict validation. Persistence policy lives
// in stored-slot.ts.
import { DraftWorkbookSchema } from '../schema';
import { storedSlot } from './stored-slot';

export const authorDraft = storedSlot('csf-author-workbook', DraftWorkbookSchema);
