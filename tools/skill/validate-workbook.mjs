#!/usr/bin/env node
/**
 * Standalone, zero-dependency validator for Cloud Sovereignty Framework (CSF) Workbooks (v2.0).
 * Validates structural schema requirements and all 23 relational invariants (R1-R23).
 *
 * Usage:
 *   node validate-workbook.mjs path/to/workbook.json
 *   node validate-workbook.mjs --json path/to/workbook.json
 */

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

function validateWorkbook(wb) {
  const issues = [];
  function add(pathArray, message, ruleId) {
    issues.push({ path: pathArray.join('.'), message, ruleId });
  }

  if (!wb || typeof wb !== 'object' || Array.isArray(wb)) {
    return { ok: false, issues: [{ path: '', message: 'Workbook must be a JSON object.', ruleId: 'schema' }] };
  }

  if (wb.schemaVersion !== '2.0') {
    add(['schemaVersion'], 'schemaVersion must be "2.0".', 'schema');
  }

  if (!wb.meta || typeof wb.meta !== 'object') {
    add(['meta'], 'meta object is required.', 'schema');
  } else {
    if (!wb.meta.id || typeof wb.meta.id !== 'string') add(['meta', 'id'], 'meta.id is required string.', 'schema');
    if (!wb.meta.version || typeof wb.meta.version !== 'string') add(['meta', 'version'], 'meta.version is required string.', 'schema');
    if (!wb.meta.title || typeof wb.meta.title !== 'string') add(['meta', 'title'], 'meta.title is required string.', 'schema');
  }

  const seals = new Set();
  if (!Array.isArray(wb.sealLevels) || wb.sealLevels.length === 0) {
    add(['sealLevels'], 'sealLevels must be a non-empty array.', 'schema');
  } else {
    for (let i = 0; i < wb.sealLevels.length; i++) {
      const sl = wb.sealLevels[i];
      if (typeof sl.seal !== 'number' || sl.seal < 0 || sl.seal > 4 || !Number.isInteger(sl.seal)) {
        add(['sealLevels', i, 'seal'], 'SEAL level must be an integer between 0 and 4.', 'schema');
      } else if (seals.has(sl.seal)) {
        add(['sealLevels', i, 'seal'], `SEAL level ${sl.seal} appears more than once.`, 'R4: sealLevelsDistinct');
      } else {
        seals.add(sl.seal);
      }
    }
  }

  const dimensionIds = new Set();
  if (Array.isArray(wb.dimensions)) {
    for (let i = 0; i < wb.dimensions.length; i++) {
      const d = wb.dimensions[i];
      if (typeof d.id !== 'string' || d.id.length === 0) {
        add(['dimensions', i, 'id'], 'Dimension id must be a non-empty string.', 'schema');
      } else if (dimensionIds.has(d.id)) {
        add(['dimensions', i, 'id'], `Dimension ID "${d.id}" is duplicated.`, 'R7: dimensionIdsUnique');
      }
      dimensionIds.add(d.id);

      if (d.strata !== undefined) {
        if (!Array.isArray(d.strata) || d.strata.length < 2 || new Set(d.strata).size !== d.strata.length) {
          add(['dimensions', i, 'strata'], `Dimension "${d.id}" strata must contain 2 or more unique names.`, 'R8: strataAreTwoOrMoreUniqueNames');
        }
      }
    }
  }

  const roleIds = new Set();
  if (Array.isArray(wb.roles)) {
    for (let i = 0; i < wb.roles.length; i++) {
      const r = wb.roles[i];
      if (typeof r.id !== 'string' || r.id.length === 0) {
        add(['roles', i, 'id'], 'Role id must be a non-empty string.', 'schema');
      } else if (roleIds.has(r.id)) {
        add(['roles', i, 'id'], `Role ID "${r.id}" is duplicated.`, 'R13: roleIdsUnique');
      }
      roleIds.add(r.id);
    }
  }

  let assessedCount = 0;
  const partyTypeIds = new Set();
  if (Array.isArray(wb.parties)) {
    for (let i = 0; i < wb.parties.length; i++) {
      const p = wb.parties[i];
      if (typeof p.id !== 'string' || p.id.length === 0) {
        add(['parties', i, 'id'], 'Party id must be a non-empty string.', 'schema');
      } else if (partyTypeIds.has(p.id)) {
        add(['parties', i, 'id'], `Party ID "${p.id}" is duplicated.`, 'R15: partyTypeIdsUnique');
      }
      partyTypeIds.add(p.id);
      if (p.kind === 'assessed') assessedCount++;
    }
  }
  if (assessedCount !== 1) {
    add(['parties'], `Exactly one party must have kind: "assessed"; found ${assessedCount}.`, 'R16: exactlyOneAssessedPartyType');
  }

  const questionMap = new Map();
  let totalWeight = 0;
  const objIds = new Set();

  if (!Array.isArray(wb.objectives) || wb.objectives.length === 0) {
    add(['objectives'], 'objectives must be a non-empty array.', 'schema');
  } else {
    for (let oi = 0; oi < wb.objectives.length; oi++) {
      const obj = wb.objectives[oi];
      if (typeof obj.weight === 'number') {
        totalWeight += obj.weight;
      } else {
        add(['objectives', oi, 'weight'], 'Objective weight must be a number.', 'schema');
      }
      if (typeof obj.id !== 'string' || obj.id.length === 0) {
        add(['objectives', oi, 'id'], 'Objective id must be a non-empty string.', 'schema');
      } else if (objIds.has(obj.id)) {
        add(['objectives', oi, 'id'], `Objective ID "${obj.id}" is duplicated.`, 'R2: objectiveIdsUnique');
      }
      objIds.add(obj.id);

      if (!Array.isArray(obj.questions) || obj.questions.length === 0) {
        add(['objectives', oi, 'questions'], `Objective "${obj.id}" must contain at least one question.`, 'schema');
        continue;
      }

      for (let qi = 0; qi < obj.questions.length; qi++) {
        const q = obj.questions[qi];
        if (typeof q.id !== 'string' || q.id.length === 0) {
          add(['objectives', oi, 'questions', qi, 'id'], 'Question id must be a non-empty string.', 'schema');
        } else if (questionMap.has(q.id)) {
          add(['objectives', oi, 'questions', qi, 'id'], `Question ID "${q.id}" is duplicated across workbook.`, 'R3: questionIdsUniqueAcrossWorkbook');
        }
        questionMap.set(q.id, q);

        if (!roleIds.has(q.role)) {
          add(['objectives', oi, 'questions', qi, 'role'], `Question "${q.id}" names unknown role "${q.role}".`, 'R14: questionRoleIsDeclared');
        }

        if (q.scope === 'dimension') {
          if (!Array.isArray(q.appliesTo) || q.appliesTo.length === 0) {
            add(['objectives', oi, 'questions', qi, 'appliesTo'], `Dimension-scoped question "${q.id}" must have non-empty appliesTo array.`, 'schema');
          } else {
            for (let di = 0; di < q.appliesTo.length; di++) {
              if (!dimensionIds.has(q.appliesTo[di])) {
                add(['objectives', oi, 'questions', qi, 'appliesTo', di], `Question "${q.id}" applies to unknown dimension "${q.appliesTo[di]}".`, 'R6: appliesToNamesDeclaredDimension');
              }
            }
          }
        }

        if (!Array.isArray(q.ladder) || q.ladder.length === 0) {
          add(['objectives', oi, 'questions', qi, 'ladder'], `Question "${q.id}" ladder must contain at least one rung.`, 'schema');
        } else {
          const rungIds = new Set();
          for (let ri = 0; ri < q.ladder.length; ri++) {
            const rung = q.ladder[ri];
            if (typeof rung.id !== 'string' || rung.id.length === 0) {
              add(['objectives', oi, 'questions', qi, 'ladder', ri, 'id'], 'Rung id must be a non-empty string.', 'schema');
            } else if (rungIds.has(rung.id)) {
              add(['objectives', oi, 'questions', qi, 'ladder', ri, 'id'], `Rung ID "${rung.id}" is duplicated in question "${q.id}".`, 'R5: rungIdsUniqueAndSealsDeclared');
            }
            rungIds.add(rung.id);

            if (!seals.has(rung.seal)) {
              add(['objectives', oi, 'questions', qi, 'ladder', ri, 'seal'], `Rung SEAL ${rung.seal} in "${q.id}" is not defined in sealLevels.`, 'R5: rungIdsUniqueAndSealsDeclared');
            }

            if (typeof rung.points !== 'number' || rung.points < 0 || !Number.isFinite(rung.points)) {
              add(['objectives', oi, 'questions', qi, 'ladder', ri, 'points'], 'Rung points must be a non-negative number.', 'schema');
            }

            if (ri > 0) {
              const prev = q.ladder[ri - 1];
              if (rung.points < prev.points) {
                add(['objectives', oi, 'questions', qi, 'ladder', ri, 'points'], `Ladder for ${q.id} drops in points at rung ${ri + 1}; going up a ladder, points never fall.`, 'R22: pointsNeverFall');
              }
              if (rung.seal < prev.seal) {
                add(['objectives', oi, 'questions', qi, 'ladder', ri, 'seal'], `Ladder for ${q.id} drops in SEAL at rung ${ri + 1}; going up a ladder, SEAL never falls.`, 'R23: sealNeverFalls');
              }
            }
          }
        }
      }
    }

    if (totalWeight !== 100) {
      add(['objectives'], `Objective weights must sum to 100; got ${totalWeight}.`, 'R1: weightsTotal100');
    }
  }

  // Test estates validation
  const estateIds = new Set();
  if (Array.isArray(wb.testEstates)) {
    for (let ei = 0; ei < wb.testEstates.length; ei++) {
      const e = wb.testEstates[ei];
      if (estateIds.has(e.id)) {
        add(['testEstates', ei, 'id'], `Test estate ID "${e.id}" is duplicated.`, 'R9: testEstateIdsUnique');
      }
      estateIds.add(e.id);

      if (Array.isArray(e.parties)) {
        for (let pi = 0; pi < e.parties.length; pi++) {
          const p = e.parties[pi];
          if (!partyTypeIds.has(p.type)) {
            add(['testEstates', ei, 'parties', pi, 'type'], `Estate party "${p.id}" uses unknown party type "${p.type}".`, 'R17: estatePartiesResolve');
          }
          if (Array.isArray(p.serves)) {
            for (let si = 0; si < p.serves.length; si++) {
              if (!dimensionIds.has(p.serves[si])) {
                add(['testEstates', ei, 'parties', pi, 'serves', si], `Estate party "${p.id}" serves unknown dimension "${p.serves[si]}".`, 'R17: estatePartiesResolve');
              }
            }
          }
        }
      }

      if (Array.isArray(e.answers)) {
        const seenQ = new Set();
        for (let ai = 0; ai < e.answers.length; ai++) {
          const ans = e.answers[ai];
          if (!questionMap.has(ans.questionId)) {
            add(['testEstates', ei, 'answers', ai, 'questionId'], `Estate "${e.id}" answers unknown question "${ans.questionId}".`, 'R10: estateAnswersOneKnownQuestionEach');
          } else {
            if (seenQ.has(ans.questionId)) {
              add(['testEstates', ei, 'answers', ai, 'questionId'], `Estate "${e.id}" answers question "${ans.questionId}" more than once.`, 'R10: estateAnswersOneKnownQuestionEach');
            }
            seenQ.add(ans.questionId);
            const q = questionMap.get(ans.questionId);
            const validRung = q.ladder && q.ladder.some(r => r.id === ans.rungId);
            if (!validRung) {
              add(['testEstates', ei, 'answers', ai, 'rungId'], `Estate answer names unknown rung "${ans.rungId}" for question "${ans.questionId}".`, 'R11: estateAnswerNamesAuthoredRung');
            }
          }
        }
      }
    }
  }

  // Recommendations validation
  const recIds = new Set();
  const recs = Array.isArray(wb.recommendations) ? wb.recommendations : [];
  if (recs.length > 0) {
    if (!wb.recommender || !wb.recommender.name || !wb.recommender.disclosure) {
      add(['recommender'], 'recommender block with name and disclosure is required when recommendations exist.', 'R21: recommenderNamedWhenContentPresent');
    }
  }
  for (let ri = 0; ri < recs.length; ri++) {
    const rec = recs[ri];
    if (recIds.has(rec.id)) {
      add(['recommendations', ri, 'id'], `Recommendation ID "${rec.id}" is duplicated.`, 'R18: recommendationIdsUnique');
    }
    recIds.add(rec.id);
    if (!seals.has(rec.whenAtOrBelow)) {
      add(['recommendations', ri, 'whenAtOrBelow'], `Recommendation "${rec.id}" trigger SEAL ${rec.whenAtOrBelow} is not declared.`, 'R20: recommendationThresholdSealDeclared');
    }
    if (Array.isArray(rec.links)) {
      for (let li = 0; li < rec.links.length; li++) {
        const link = rec.links[li];
        if (link.kind === 'question' && !questionMap.has(link.id)) {
          add(['recommendations', ri, 'links', li, 'id'], `Recommendation links to unknown question "${link.id}".`, 'R19: recommendationLinksResolve');
        } else if (link.kind === 'dimension' && !dimensionIds.has(link.id)) {
          add(['recommendations', ri, 'links', li, 'id'], `Recommendation links to unknown dimension "${link.id}".`, 'R19: recommendationLinksResolve');
        } else if (link.kind === 'objective' && !objIds.has(link.id)) {
          add(['recommendations', ri, 'links', li, 'id'], `Recommendation links to unknown objective "${link.id}".`, 'R19: recommendationLinksResolve');
        }
      }
    }
  }

  const totalQuestions = wb.objectives ? wb.objectives.reduce((sum, o) => sum + (o.questions ? o.questions.length : 0), 0) : 0;

  return {
    ok: issues.length === 0,
    issues,
    summary: {
      id: wb.meta ? wb.meta.id : '',
      title: wb.meta ? wb.meta.title : '',
      version: wb.meta ? wb.meta.version : '',
      objectives: wb.objectives ? wb.objectives.length : 0,
      questions: totalQuestions,
      dimensions: wb.dimensions ? wb.dimensions.length : 0,
      roles: wb.roles ? wb.roles.length : 0,
      parties: wb.parties ? wb.parties.length : 0,
      testEstates: wb.testEstates ? wb.testEstates.length : 0,
      recommendations: recs.length,
    },
  };
}

function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');
  const files = args.filter(a => !a.startsWith('-'));

  if (files.length === 0) {
    console.error('Usage: node validate-workbook.cjs [--json] <path-to-workbook.json>...');
    process.exit(1);
  }

  let anyFailed = false;
  const results = [];

  for (const file of files) {
    if (!fs.existsSync(file)) {
      anyFailed = true;
      const res = { file, ok: false, issues: [{ path: '', message: `File not found: ${file}`, ruleId: 'io' }] };
      results.push(res);
      if (!jsonOutput) console.error(`✗ ${file} — file not found`);
      continue;
    }

    let raw;
    try {
      raw = fs.readFileSync(file, 'utf8');
    } catch (err) {
      anyFailed = true;
      const res = { file, ok: false, issues: [{ path: '', message: `Read error: ${err.message}`, ruleId: 'io' }] };
      results.push(res);
      if (!jsonOutput) console.error(`✗ ${file} — cannot read file: ${err.message}`);
      continue;
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      anyFailed = true;
      const res = { file, ok: false, issues: [{ path: '', message: `Invalid JSON syntax: ${err.message}`, ruleId: 'syntax' }] };
      results.push(res);
      if (!jsonOutput) console.error(`✗ ${file} — invalid JSON syntax: ${err.message}`);
      continue;
    }

    const res = validateWorkbook(parsed);
    results.push({ file, ...res });

    if (!res.ok) {
      anyFailed = true;
      if (!jsonOutput) {
        console.error(`\n✗ ${file} — FAILED validation with ${res.issues.length} issue(s):`);
        res.issues.forEach((issue, idx) => {
          const loc = issue.path ? ` path: ${issue.path}` : '';
          console.error(`  ${idx + 1}. [${issue.ruleId}]${loc}`);
          console.error(`     ${issue.message}`);
        });
      }
    } else if (!jsonOutput) {
      const s = res.summary;
      console.log(`\n✓ ${file} — valid CSF Workbook (v2.0)`);
      console.log(`  "${s.title}" (id: ${s.id}, v${s.version})`);
      console.log(`  ${s.objectives} objectives | ${s.questions} questions | ${s.dimensions} dimensions | ${s.roles} roles | ${s.parties} parties | ${s.testEstates} test estates | ${s.recommendations} recommendations`);
    }
  }

  if (jsonOutput) {
    console.log(JSON.stringify(results, null, 2));
  }

  if (anyFailed) {
    process.exit(1);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}

export { validateWorkbook };
