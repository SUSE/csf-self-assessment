import { z } from 'zod';
import type { Workbook } from './workbook';

// The workbook's cross-record rules (R1–R23) — everything a single field cannot
// check on its own: weights that must total, ids that must be unique, and every
// reference that must resolve inside the OWNING workbook. Attached to
// WorkbookSchema via superRefine.
//
// The rule numbers are cited by the authoring rulebook and the tests, so they
// are stable identifiers — R12 is retired and the gap is deliberate. They live
// here as a table, not as comments, so one rule is one named unit a test can run
// on its own. The table is internal to this module: WORKBOOK_RULES is not part
// of the package's public schema surface.

type Ctx = z.RefinementCtx;
type Path = (string | number)[];

type WorkbookRule = {
  id: string;
  name: string;
  check: (wb: Workbook, ctx: Ctx) => void;
};

function reject(ctx: Ctx, path: Path, message: string): void {
  ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
}

function rejectDuplicates(ctx: Ctx, path: Path, values: unknown[], message: string): void {
  if (new Set(values).size !== values.length) reject(ctx, path, message);
}

// Walks every question with its (objective, question) index pair, so a rule can
// point an issue at the exact card that owns it.
function eachQuestion(
  wb: Workbook,
  visit: (q: Workbook['objectives'][number]['questions'][number], path: Path) => void,
): void {
  wb.objectives.forEach((o, oi) =>
    o.questions.forEach((q, qi) => visit(q, ['objectives', oi, 'questions', qi])),
  );
}

// Derived sets several rules resolve references against. Recomputed per rule:
// workbooks are small, and a rule that owns its own lookups stays runnable alone.
const objectiveIds = (wb: Workbook) => new Set(wb.objectives.map((o) => o.id));
const questionIds = (wb: Workbook) =>
  new Set(wb.objectives.flatMap((o) => o.questions.map((q) => q.id)));
const dimensionIds = (wb: Workbook) => new Set(wb.dimensions.map((d) => d.id));
const declaredSeals = (wb: Workbook) => new Set(wb.sealLevels.map((l) => l.seal));

export const WORKBOOK_RULES: WorkbookRule[] = [
  {
    id: 'R1',
    name: 'weightsTotal100',
    check(wb, ctx) {
      const total = wb.objectives.reduce((s, o) => s + o.weight, 0);
      if (total !== 100) {
        reject(ctx, ['objectives'], `Objective weights must sum to 100; got ${total}.`);
      }
    },
  },
  {
    id: 'R2',
    name: 'objectiveIdsUnique',
    check(wb, ctx) {
      rejectDuplicates(
        ctx,
        ['objectives'],
        wb.objectives.map((o) => o.id),
        'Objective ids must be unique.',
      );
    },
  },
  {
    id: 'R3',
    name: 'questionIdsUniqueAcrossWorkbook',
    check(wb, ctx) {
      rejectDuplicates(
        ctx,
        ['objectives'],
        wb.objectives.flatMap((o) => o.questions.map((q) => q.id)),
        'Question ids must be unique across the workbook.',
      );
    },
  },
  {
    id: 'R4',
    name: 'sealLevelsDistinct',
    check(wb, ctx) {
      rejectDuplicates(
        ctx,
        ['sealLevels'],
        wb.sealLevels.map((l) => l.seal),
        'sealLevels must not repeat a SEAL.',
      );
    },
  },
  {
    id: 'R5',
    name: 'rungIdsUniqueAndSealsDeclared',
    check(wb, ctx) {
      const seals = declaredSeals(wb);
      eachQuestion(wb, (q, path) => {
        rejectDuplicates(
          ctx,
          [...path, 'ladder'],
          q.ladder.map((r) => r.id),
          `Ladder for ${q.id} repeats a rung id; every rung id must be unique within its question.`,
        );
        q.ladder.forEach((r, ri) => {
          if (!seals.has(r.seal)) {
            reject(
              ctx,
              [...path, 'ladder', ri, 'seal'],
              `Rung SEAL ${r.seal} in ${q.id} is not defined in sealLevels.`,
            );
          }
        });
      });
    },
  },
  {
    id: 'R6',
    name: 'appliesToNamesDeclaredDimension',
    check(wb, ctx) {
      const dimIds = dimensionIds(wb);
      eachQuestion(wb, (q, path) => {
        if (q.grain !== 'dimension') return;
        q.appliesTo.forEach((dimId, di) => {
          if (!dimIds.has(dimId)) {
            reject(
              ctx,
              [...path, 'appliesTo', di],
              `Question ${q.id} applies to unknown dimension "${dimId}".`,
            );
          }
        });
      });
    },
  },
  {
    id: 'R7',
    name: 'dimensionIdsUnique',
    check(wb, ctx) {
      rejectDuplicates(
        ctx,
        ['dimensions'],
        wb.dimensions.map((d) => d.id),
        'Dimension ids must be unique.',
      );
    },
  },
  {
    id: 'R8',
    name: 'strataAreTwoOrMoreUniqueNames',
    check(wb, ctx) {
      // A one-stratum split is no split.
      wb.dimensions.forEach((d, di) => {
        if (d.strata === undefined) return;
        if (d.strata.length < 2) {
          reject(
            ctx,
            ['dimensions', di, 'strata'],
            `Dimension ${d.id} declares ${d.strata.length} stratum; a split needs at least 2.`,
          );
        }
        rejectDuplicates(
          ctx,
          ['dimensions', di, 'strata'],
          d.strata,
          `Dimension ${d.id} repeats a stratum name.`,
        );
      });
    },
  },
  {
    id: 'R9',
    name: 'testEstateIdsUnique',
    check(wb, ctx) {
      rejectDuplicates(
        ctx,
        ['testEstates'],
        wb.testEstates.map((e) => e.id),
        'Test-estate ids must be unique.',
      );
    },
  },
  {
    id: 'R10',
    name: 'estateAnswersOneKnownQuestionEach',
    check(wb, ctx) {
      const qIdSet = questionIds(wb);
      wb.testEstates.forEach((estate, ei) => {
        const seen = new Set<string>();
        estate.answers.forEach((a, ai) => {
          if (!qIdSet.has(a.questionId)) {
            reject(
              ctx,
              ['testEstates', ei, 'answers', ai, 'questionId'],
              `Estate ${estate.id} answers unknown question "${a.questionId}".`,
            );
          }
          if (seen.has(a.questionId)) {
            reject(
              ctx,
              ['testEstates', ei, 'answers', ai],
              `Estate ${estate.id} answers question "${a.questionId}" more than once.`,
            );
          }
          seen.add(a.questionId);
        });
      });
    },
  },
  {
    id: 'R11',
    name: 'estateAnswerNamesAuthoredRung',
    check(wb, ctx) {
      const ladderRungIds = new Map(
        wb.objectives.flatMap((o) =>
          o.questions.map((q) => [q.id, new Set(q.ladder.map((r) => r.id))] as const),
        ),
      );
      wb.testEstates.forEach((estate, ei) => {
        estate.answers.forEach((a, ai) => {
          const rungIds = ladderRungIds.get(a.questionId);
          if (rungIds && !rungIds.has(a.rungId)) {
            reject(
              ctx,
              ['testEstates', ei, 'answers', ai, 'rungId'],
              `Estate ${estate.id} answers ${a.questionId} at rung "${a.rungId}", which that ladder does not author.`,
            );
          }
        });
      });
    },
  },
  // R12 is retired; the gap is deliberate.
  {
    id: 'R13',
    name: 'roleIdsUnique',
    check(wb, ctx) {
      rejectDuplicates(
        ctx,
        ['roles'],
        wb.roles.map((r) => r.id),
        'Role ids must be unique.',
      );
    },
  },
  {
    id: 'R14',
    name: 'questionRoleIsDeclared',
    check(wb, ctx) {
      const roleIds = new Set(wb.roles.map((r) => r.id));
      eachQuestion(wb, (q, path) => {
        if (!roleIds.has(q.role)) {
          reject(ctx, [...path, 'role'], `Question ${q.id} names unknown role "${q.role}".`);
        }
      });
    },
  },
  {
    id: 'R15',
    name: 'partyTypeIdsUnique',
    check(wb, ctx) {
      rejectDuplicates(
        ctx,
        ['parties'],
        wb.parties.map((p) => p.id),
        'Party-type ids must be unique.',
      );
    },
  },
  {
    id: 'R16',
    name: 'exactlyOneAssessedPartyType',
    check(wb, ctx) {
      // The one structural constraint on the taxonomy, since the engine reads
      // `kind`, never an id.
      const assessedCount = wb.parties.filter((p) => p.kind === 'assessed').length;
      if (assessedCount !== 1) {
        reject(
          ctx,
          ['parties'],
          `Exactly one party type must have kind 'assessed'; found ${assessedCount}.`,
        );
      }
    },
  },
  {
    id: 'R17',
    name: 'estatePartiesResolve',
    check(wb, ctx) {
      // No assessed-count check: test estates are references, not assessments,
      // so parties.md invariant #4 does not scope to them.
      const partyTypeIds = new Set(wb.parties.map((p) => p.id));
      const dimIds = dimensionIds(wb);
      wb.testEstates.forEach((estate, ei) => {
        estate.parties.forEach((party, pi) => {
          if (!partyTypeIds.has(party.type)) {
            reject(
              ctx,
              ['testEstates', ei, 'parties', pi, 'type'],
              `Estate ${estate.id} party ${party.id} has unknown party type "${party.type}".`,
            );
          }
          party.serves.forEach((dimId, si) => {
            if (!dimIds.has(dimId)) {
              reject(
                ctx,
                ['testEstates', ei, 'parties', pi, 'serves', si],
                `Estate ${estate.id} party ${party.id} serves unknown dimension "${dimId}".`,
              );
            }
          });
        });
      });
    },
  },
  {
    id: 'R18',
    name: 'recommendationIdsUnique',
    check(wb, ctx) {
      rejectDuplicates(
        ctx,
        ['recommendations'],
        wb.recommendations.map((r) => r.id),
        'Recommendation ids must be unique.',
      );
    },
  },
  {
    id: 'R19',
    name: 'recommendationLinksResolve',
    check(wb, ctx) {
      const qIdSet = questionIds(wb);
      const dimIds = dimensionIds(wb);
      const objIdSet = objectiveIds(wb);
      wb.recommendations.forEach((rec, ri) => {
        rec.links.forEach((link, li) => {
          const target =
            link.kind === 'question' ? qIdSet : link.kind === 'dimension' ? dimIds : objIdSet;
          if (!target.has(link.id)) {
            reject(
              ctx,
              ['recommendations', ri, 'links', li, 'id'],
              `Recommendation ${rec.id} links to unknown ${link.kind} "${link.id}".`,
            );
          }
        });
      });
    },
  },
  {
    id: 'R20',
    name: 'recommendationThresholdSealDeclared',
    check(wb, ctx) {
      const seals = declaredSeals(wb);
      wb.recommendations.forEach((rec, ri) => {
        if (!seals.has(rec.whenAtOrBelow)) {
          reject(
            ctx,
            ['recommendations', ri, 'whenAtOrBelow'],
            `Recommendation ${rec.id} triggers at SEAL ${rec.whenAtOrBelow}, which is not defined in sealLevels.`,
          );
        }
      });
    },
  },
  {
    id: 'R21',
    name: 'recommenderNamedWhenContentPresent',
    check(wb, ctx) {
      // Attribution is structural: vendor content names who is speaking.
      if (wb.recommendations.length > 0 && wb.recommender === undefined) {
        reject(
          ctx,
          ['recommender'],
          'A workbook that carries recommendations must name its recommender.',
        );
      }
    },
  },
  {
    id: 'R22',
    name: 'pointsNeverFall',
    check(wb, ctx) {
      eachQuestion(wb, (q, path) => {
        q.ladder.forEach((r, ri) => {
          if (ri === 0) return;
          if (r.points < q.ladder[ri - 1].points) {
            reject(
              ctx,
              [...path, 'ladder', ri, 'points'],
              `Ladder for ${q.id} drops in points at rung ${ri + 1}; going up a ladder, points never fall.`,
            );
          }
        });
      });
    },
  },
  {
    id: 'R23',
    name: 'sealNeverFalls',
    check(wb, ctx) {
      eachQuestion(wb, (q, path) => {
        q.ladder.forEach((r, ri) => {
          if (ri === 0) return;
          if (r.seal < q.ladder[ri - 1].seal) {
            reject(
              ctx,
              [...path, 'ladder', ri, 'seal'],
              `Ladder for ${q.id} drops in SEAL at rung ${ri + 1}; going up a ladder, SEAL never falls.`,
            );
          }
        });
      });
    },
  },
];

export function refineWorkbook(wb: Workbook, ctx: Ctx): void {
  for (const rule of WORKBOOK_RULES) rule.check(wb, ctx);
}
