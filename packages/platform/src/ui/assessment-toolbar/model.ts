import type { LucideIcon } from '@lucide/svelte';
import Settings2 from '@lucide/svelte/icons/settings-2';
import Building2 from '@lucide/svelte/icons/building-2';
import ListChecks from '@lucide/svelte/icons/list-checks';
import ListTodo from '@lucide/svelte/icons/list-todo';

// The assessor's content-navigation sections, the
// participant-app twin of the Author workbench's instrument SectionNav. The
// toolbar switches between them; each renders in the main region. The four
// sections are overview | parties | claims | questions.
export type AssessmentSection = 'overview' | 'parties' | 'claims' | 'questions';

// The walk order: the toolbar's tab order, the stage carousel's direction axis, and
// the set a restored view may name. One source of truth — the app keeps no copy
// (twin of FACILITATOR_SECTIONS).
export const ASSESSMENT_SECTIONS: readonly AssessmentSection[] = [
  'overview',
  'claims',
  'parties',
  'questions',
];

// How each section draws. `rule` names the PARTICIPANT_RULES card that explains it.
// "Current question" opens the ONE question the walk is on; All questions, the set.
export const SECTION_META: Record<
  AssessmentSection,
  { label: string; Icon: LucideIcon; rule?: string }
> = {
  overview: { label: 'Overview', Icon: Settings2, rule: 'overview' },
  parties: { label: 'Parties', Icon: Building2, rule: 'parties' },
  claims: { label: 'Claims', Icon: ListChecks, rule: 'claims' },
  questions: { label: 'Current question', Icon: ListTodo, rule: 'questions' },
};

export function isAssessmentSection(raw: unknown): raw is AssessmentSection {
  return ASSESSMENT_SECTIONS.some((section) => section === raw);
}
