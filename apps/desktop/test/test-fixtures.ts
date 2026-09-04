import { fileURLToPath } from 'node:url';

export const alexPath = fileURLToPath(new URL('../../../samples/recommendations/partial-Alex.json', import.meta.url));
export const janePath = fileURLToPath(new URL('../../../samples/recommendations/partial-Jane.json', import.meta.url));
export const workbookAssessmentPath = fileURLToPath(new URL('../../../samples/recommendations/workbook-assessment.json', import.meta.url));
export const workbookPath = fileURLToPath(new URL('../../../samples/recommendations/workbook.json', import.meta.url));
