import { fileURLToPath } from 'node:url';

export const alexPath = fileURLToPath(new URL('../../../assessment/partial-Alex.json', import.meta.url));
export const janePath = fileURLToPath(new URL('../../../assessment/partial-Jane.json', import.meta.url));
export const workbookAssessmentPath = fileURLToPath(new URL('../../../assessment/workbook-assessment.json', import.meta.url));
export const workbookPath = fileURLToPath(new URL('../../../assessment/workbook.json', import.meta.url));
