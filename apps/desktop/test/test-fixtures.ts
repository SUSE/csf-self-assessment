import { fileURLToPath } from 'node:url';

export const alexPath = fileURLToPath(new URL('../../../samples/recommendations/partial-Alex.json', import.meta.url));
export const janePath = fileURLToPath(new URL('../../../samples/recommendations/partial-Jane.json', import.meta.url));
export const workbookAssessmentPath = fileURLToPath(new URL('../../../samples/recommendations/workbook-assessment.json', import.meta.url));
export const workbookPath = fileURLToPath(new URL('../../../samples/recommendations/workbook.json', import.meta.url));

export const csfWorkbookPath = fileURLToPath(new URL('../../../samples/csf-workbook.json', import.meta.url));
export const euCsfCalculatorWorkbookPath = fileURLToPath(new URL('../../../samples/ec-guidance-complete/workbook.json', import.meta.url));
export const euCsfCalculatorFillAlexPath = fileURLToPath(new URL('../../../samples/ec-guidance-complete/alex.json', import.meta.url));
export const euCsfCalculatorFillJanePath = fileURLToPath(new URL('../../../samples/ec-guidance-complete/jane.json', import.meta.url));
