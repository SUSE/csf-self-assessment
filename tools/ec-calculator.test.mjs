import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { DROPPED_ROWS, extractSource, readSheet } from './ec-calculator-source.mjs';
import { buildWorkbook, OUTPUT_PATH } from './ec-calculator-workbook.mjs';

const XLSX = 'docs/eu-csf/calculator.xlsx';

describe('readSheet', () => {
  const rows = readSheet(XLSX);
  const numbers = Object.keys(rows).map(Number);

  it('covers every row of the sheet', () => {
    assert.equal(numbers.length, 251);
    assert.equal(Math.max(...numbers), 251);
  });

  it('reads the objective header row', () => {
    assert.equal(rows[4].A, 'SOV-1 Strategic Sovereignty');
    assert.equal(rows[4].D, '0.2');
  });

  it('reads a rung row as cell text', () => {
    assert.equal(rows[5].C, '1. Entirely outside the EU');
    assert.equal(rows[5].D, '0');
    assert.equal(rows[5].F, '1');
  });

  it('keeps the unreadable rows as cells', () => {
    assert.equal(rows[31].C, ' ');
    assert.equal(rows[17].C, '0');
    assert.equal('C' in rows[7], false);
  });

  it('decodes XML entities', () => {
    assert.equal(rows[34].C, "Strategic projects depend on contractor's involvement");
  });

  it('reads the fictitious-values note', () => {
    assert.equal(
      rows[4].I,
      'Please note: column E "score" has been filled with fictitious values that do not refer to any specific example for the sole purpose of exemplification.',
    );
  });
});

describe('extractSource', () => {
  const source = extractSource(XLSX);
  const questions = source.objectives.flatMap((o) => o.questions);
  const byId = new Map(questions.map((q) => [q.id, q]));

  it('has the eight weighted objectives', () => {
    assert.equal(source.objectives.length, 8);
    assert.deepEqual(
      source.objectives.map((o) => o.id),
      ['SOV-1', 'SOV-2', 'SOV-3', 'SOV-4', 'SOV-5', 'SOV-6', 'SOV-7', 'SOV-8'],
    );
    const weights = source.objectives.map((o) => o.weight);
    assert.deepEqual(weights, [20, 10, 10, 15, 10, 15, 15, 5]);
    assert.equal(
      weights.reduce((a, b) => a + b, 0),
      100,
    );
  });

  it('has 48 questions and 233 rungs', () => {
    assert.equal(questions.length, 48);
    assert.deepEqual(
      source.objectives.map((o) => o.questions.length),
      [8, 6, 5, 6, 7, 5, 7, 4],
    );
    const rungs = questions.flatMap((q) => q.rungs);
    assert.equal(rungs.length, 233);
    assert.equal(
      rungs.some((r) => DROPPED_ROWS.includes(r.row)),
      false,
    );
  });

  it('numbers questions from column A', () => {
    for (const id of ['SOV-1.1', 'SOV-1.6', 'SOV-8.4']) assert.ok(byId.has(id));
  });

  it('keeps the source ladder sizes', () => {
    for (const id of ['SOV-1.6', 'SOV-2.1']) assert.equal(byId.get(id).rungs.length, 3);
    for (const id of ['SOV-1.1', 'SOV-1.3', 'SOV-1.7'])
      assert.equal(byId.get(id).rungs.length, 4);
    const others = questions.filter(
      (q) => !['SOV-1.6', 'SOV-2.1', 'SOV-1.1', 'SOV-1.3', 'SOV-1.7'].includes(q.id),
    );
    assert.deepEqual([...new Set(others.map((q) => q.rungs.length))], [5]);
  });

  it('splits text from why', () => {
    assert.equal(byId.get('SOV-1.1').text, 'EU/EEA legal entity control');
    assert.ok(
      byId
        .get('SOV-1.1')
        .why.startsWith('ensuring that ultimate decision-making authority resides'),
    );
    assert.deepEqual(
      questions.filter((q) => q.why === null).map((q) => q.id),
      ['SOV-3.1', 'SOV-4.3'],
    );
  });

  it('strips the ordinal prefix from rung text', () => {
    const rungs = byId.get('SOV-1.2').rungs;
    const first = rungs[0];
    const last = rungs[rungs.length - 1];
    assert.deepEqual(
      { text: first.text, points: first.points, seal: first.seal },
      { text: 'Very likely', points: 0, seal: 4 },
    );
    assert.deepEqual(
      { text: last.text, points: last.points, seal: last.seal },
      { text: 'Very unlikely', points: 125, seal: 4 },
    );
  });

  it('never falls going up a ladder', () => {
    let violations = 0;
    for (const q of questions) {
      for (let i = 1; i < q.rungs.length; i += 1) {
        if (q.rungs[i].points < q.rungs[i - 1].points) violations += 1;
        if (q.rungs[i].seal < q.rungs[i - 1].seal) violations += 1;
      }
    }
    assert.equal(violations, 0);
  });

  it('carries the 47 source selections', () => {
    assert.equal(questions.flatMap((q) => q.rungs).filter((r) => r.selected).length, 47);
    assert.deepEqual(
      questions.filter((q) => !q.rungs.some((r) => r.selected)).map((q) => q.id),
      ['SOV-1.6'],
    );
  });

  it('carries the fictitious-values note', () => {
    assert.equal(source.fictitiousNote, readSheet(XLSX)[4].I);
  });
});

describe('buildWorkbook', () => {
  const workbook = buildWorkbook(extractSource(XLSX));
  const questions = workbook.objectives.flatMap((o) => o.questions);
  const estateById = new Map(workbook.testEstates.map((e) => [e.id, e]));
  const answersOf = (id) =>
    new Map(estateById.get(id).answers.map((a) => [a.questionId, a.rungId]));

  it('carries the authored preamble', () => {
    assert.deepEqual(workbook.meta, {
      id: 'eu-csf-calculator',
      version: '1.0.0',
      title: 'EU Cloud Sovereignty Framework — Sovereignty Calculator',
    });
    assert.equal(workbook.frontSheet.length, 3);
    assert.ok(workbook.frontSheet[0].includes(extractSource(XLSX).fictitiousNote));
    assert.deepEqual(workbook.dimensions, []);
    assert.equal(workbook.roles.length, 1);
    assert.equal(workbook.roles[0].id, 'ALL');
    assert.equal(workbook.parties.length, 1);
    assert.equal(workbook.parties[0].id, 'assessed-organisation');
    assert.equal(workbook.parties[0].kind, 'assessed');
    assert.deepEqual(
      workbook.sealLevels,
      JSON.parse(readFileSync('samples/csf-workbook.json', 'utf8')).sealLevels,
    );
  });

  it('makes every question party-grain, assessment-axis, role ALL', () => {
    for (const q of questions) {
      assert.equal(q.grain, 'party');
      assert.equal(q.axis, 'assessment');
      assert.equal(q.role, 'ALL');
    }
  });

  it('marks exactly the five ranking questions', () => {
    assert.deepEqual(
      questions.filter((q) => q.defaultMateriality === 'ranking').map((q) => q.id),
      ['SOV-3.5', 'SOV-5.1', 'SOV-5.2', 'SOV-5.3', 'SOV-6.5'],
    );
    assert.equal(questions.filter((q) => q.defaultMateriality === 'material').length, 43);
  });

  it('ids every rung by authored position', () => {
    let seen = 0;
    for (const q of questions) {
      q.ladder.forEach((rung, index) => {
        assert.equal(rung.id, `choice-${index + 1}`);
        seen += 1;
      });
    }
    assert.equal(seen, 233);
  });

  it('omits an absent why entirely', () => {
    const byId = new Map(questions.map((q) => [q.id, q]));
    assert.equal('why' in byId.get('SOV-3.1'), false);
    assert.equal(typeof byId.get('SOV-1.1').why, 'string');
  });

  it('ships the two test estates', () => {
    assert.deepEqual(
      workbook.testEstates.map((e) => e.id),
      ['source-worked-example', 'best-available-today'],
    );
    for (const estate of workbook.testEstates) {
      assert.equal(estate.parties.length, 1);
      assert.equal(estate.parties[0].type, 'assessed-organisation');
      assert.deepEqual(estate.parties[0].serves, []);
    }
  });

  it('derives the source worked example from column E', () => {
    const answers = answersOf('source-worked-example');
    assert.equal(answers.size, 47);
    assert.equal(answers.has('SOV-1.6'), false);
    assert.equal(answers.get('SOV-1.1'), 'choice-4');
    assert.equal(answers.get('SOV-1.3'), 'choice-2');
    assert.equal(answers.get('SOV-6.5'), 'choice-2');
    assert.equal(answers.get('SOV-7.7'), 'choice-5');
  });

  it('derives the ceiling probe from the top rungs', () => {
    const answers = answersOf('best-available-today');
    assert.equal(answers.size, 48);
    for (const id of ['SOV-3.5', 'SOV-5.1', 'SOV-5.2', 'SOV-5.3', 'SOV-6.5'])
      assert.equal(answers.get(id), 'choice-4');
    for (const id of ['SOV-1.6', 'SOV-2.1']) assert.equal(answers.get(id), 'choice-3');
    for (const id of ['SOV-1.1', 'SOV-1.3', 'SOV-1.7'])
      assert.equal(answers.get(id), 'choice-4');
    const pinned = [
      'SOV-3.5',
      'SOV-5.1',
      'SOV-5.2',
      'SOV-5.3',
      'SOV-6.5',
      'SOV-1.6',
      'SOV-2.1',
      'SOV-1.1',
      'SOV-1.3',
      'SOV-1.7',
    ];
    for (const q of questions)
      if (!pinned.includes(q.id)) assert.equal(answers.get(q.id), 'choice-5');
  });
});

describe('source parity', () => {
  it('has the checked-in JSON matching the spreadsheet', () => {
    assert.deepEqual(
      JSON.parse(readFileSync(OUTPUT_PATH, 'utf8')),
      buildWorkbook(extractSource(XLSX)),
    );
  });
});
