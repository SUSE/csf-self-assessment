import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import {
  buildDeepWorkbook,
  DIMENSION_QUESTION_APPLIES_TO,
  ENTITY_QUESTION_IDS,
  OUTPUT_PATH,
  WORKBOOK_PATH,
} from './ec-calculator-deep-workbook.mjs';

const imported = JSON.parse(readFileSync(WORKBOOK_PATH, 'utf8'));
const deep = buildDeepWorkbook(imported);
const questions = deep.objectives.flatMap((o) => o.questions);
const sourceQuestions = imported.objectives.flatMap((o) => o.questions);

describe('buildDeepWorkbook', () => {
  it('re-grains the instrument without altering it', () => {
    assert.equal(questions.length, 48);
    assert.equal(questions.flatMap((q) => q.ladder).length, 233);
    assert.deepEqual(
      questions.map((q) => q.id),
      sourceQuestions.map((q) => q.id),
    );
    assert.deepEqual(
      questions.map((q) => q.ladder),
      sourceQuestions.map((q) => q.ladder),
    );
    assert.deepEqual(
      deep.objectives.map((o) => o.weight),
      imported.objectives.map((o) => o.weight),
    );
  });

  it('splits the questions 9 / 19 / 20, the guidance counts (p13)', () => {
    const byGrain = (predicate) => questions.filter(predicate).map((q) => q.id);
    assert.equal(ENTITY_QUESTION_IDS.length, 9);
    assert.equal(Object.keys(DIMENSION_QUESTION_APPLIES_TO).length, 19);
    assert.deepEqual(
      byGrain((q) => q.grain === 'party' && q.axis === 'party'),
      ENTITY_QUESTION_IDS,
    );
    assert.deepEqual(
      byGrain((q) => q.grain === 'dimension'),
      Object.keys(DIMENSION_QUESTION_APPLIES_TO),
    );
    assert.equal(byGrain((q) => q.grain === 'party' && q.axis === 'assessment').length, 20);
  });

  it('carries the nine diagram blocks, six of them critical', () => {
    assert.deepEqual(
      deep.dimensions.map((d) => d.id),
      [
        'compute',
        'storage',
        'network',
        'iam',
        'platform',
        'security',
        'software-supply',
        'edge',
        'facilities',
      ],
    );
    assert.deepEqual(
      deep.dimensions.filter((d) => d.critical).map((d) => d.id),
      ['compute', 'storage', 'network', 'iam', 'platform', 'security'],
    );
    assert.ok(deep.dimensions.every((d) => d.strata.length >= 2));
  });

  it('names the chain the guidance forbids stopping short of', () => {
    assert.deepEqual(
      deep.parties.map((p) => [p.id, p.kind]),
      [
        ['assessed-organisation', 'assessed'],
        ['contractor', 'third-party'],
        ['sub-contractor', 'third-party'],
        ['supplier', 'third-party'],
      ],
    );
    assert.ok(deep.testEstates.every((e) => e.parties.length === 4));
  });

  it('keeps every estate selection the import made', () => {
    assert.deepEqual(
      deep.testEstates.map((e) => e.answers),
      imported.testEstates.map((e) => e.answers),
    );
  });

  it('matches the committed sample', () => {
    assert.deepEqual(deep, JSON.parse(readFileSync(OUTPUT_PATH, 'utf8')));
  });
});
