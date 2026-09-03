import type { Workbook } from '../schema';
import { nextId } from './links';

// --- test estates (spec §9 S9b) ------------------------------------------

// A new estate starts from an institution-only party list, no answers.
export function addTestEstate(wb: Workbook): Workbook {
  const id = nextId(wb.testEstates.map((e) => e.id), 'estate');
  return {
    ...wb,
    testEstates: [
      ...wb.testEstates,
      {
        id,
        name: 'New estate',
        description: 'Describe this reference estate.',
        parties: [{ id: 'inst', name: 'Institution', type: 'institution', serves: [] }],
        answers: [],
      },
    ],
  };
}

export function updateTestEstate(
  wb: Workbook,
  estateId: string,
  patch: Partial<{ id: string; name: string; description: string }>,
): Workbook {
  return {
    ...wb,
    testEstates: wb.testEstates.map((e) => (e.id === estateId ? { ...e, ...patch } : e)),
  };
}

export function removeTestEstate(wb: Workbook, estateId: string): Workbook {
  return { ...wb, testEstates: wb.testEstates.filter((e) => e.id !== estateId) };
}

// Upsert the estate's answer for a question ("which rung would this estate
// honestly pick?"). The card only offers authored rungs (R11).
export function setEstateAnswer(
  wb: Workbook,
  estateId: string,
  questionId: string,
  rungId: string,
): Workbook {
  return {
    ...wb,
    testEstates: wb.testEstates.map((e) => {
      if (e.id !== estateId) return e;
      const exists = e.answers.some((a) => a.questionId === questionId);
      const answers = exists
        ? e.answers.map((a) => (a.questionId === questionId ? { ...a, rungId } : a))
        : [...e.answers, { questionId, rungId }];
      return { ...e, answers };
    }),
  };
}

export function clearEstateAnswer(
  wb: Workbook,
  estateId: string,
  questionId: string,
): Workbook {
  return {
    ...wb,
    testEstates: wb.testEstates.map((e) =>
      e.id === estateId
        ? { ...e, answers: e.answers.filter((a) => a.questionId !== questionId) }
        : e,
    ),
  };
}
