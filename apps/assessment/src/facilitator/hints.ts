import type { FacilitatorSection } from '@csf/platform/ui/facilitator-toolbar';

// What the rail reads on each facilitator screen when nothing is selected, naming
// what to click on THIS page. Data, not branches of prose in the rail's markup —
// adding a section adds a line here and nothing else.
export const FACILITATOR_HINTS: Record<FacilitatorSection, string> = {
  overview:
    'Click a spoke on the instrument to inspect the questions that land on it, grouped by objective. A reading in the ledger jumps to the section it names.',
  frontsheet: 'The front sheet as participants will read it, before you set the estate up.',
  objectives: 'The objectives this instrument scores, with the questions each one asks.',
  dimensions: 'The dimensions in scope — a critical one can pin the estate floor.',
  roles: 'The answering roles the instrument names, and the load each one carries.',
  'party-types': 'The party types questions fan over — one answer per declared party of each.',
  parties:
    'Name the estate and seed the parties you already know. Export the workbook-assessment to distribute to participants — they can add parties they discover in context.',
  setup:
    'Name the estate and seed the parties you already know. Export the workbook-assessment to distribute to participants — they can add parties they discover in context.',
  merge:
    'Add one returned partial at a time — the first one carries the workbook-assessment, so it establishes the estate. Decide every clash, land it, then export the final assessment. History keeps the ledger of everything landed so far.',
  dashboard:
    'The estate as it stands right now — floor, score and what is still open. Every reading is taken over what has landed so far; the ribbon names that base.',
  questions:
    'Click a question to see its details — the answering role, the dimensions and strata (or parties) it covers with their selected SEAL, and its full answer ladder. Import a returned partial to see the SEAL each question was answered at.',
};
