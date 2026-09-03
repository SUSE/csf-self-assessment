import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import {
  baseSelections,
  buildFill,
  CLAIMS,
  JANE_CHANGES,
  SYNTHETIC_EVIDENCE,
  WORKBOOK_PATH,
} from './ec-calculator-fills.mjs';

const workbook = JSON.parse(readFileSync(WORKBOOK_PATH, 'utf8'));

function byQuestion(fill) {
  return new Map(fill.answers.map((answer) => [answer.questionId, answer]));
}

describe('baseSelections', () => {
  it('fills the one blank the source leaves', () => {
    const selections = baseSelections(workbook);
    assert.equal(selections.size, 48);
    assert.equal(selections.get('SOV-1.6'), 'choice-1');
    assert.equal(selections.get('SOV-1.1'), 'choice-4');
    assert.equal(selections.get('SOV-1.2'), 'choice-3');
    assert.equal(selections.get('SOV-2.1'), 'choice-3');
    assert.equal(selections.get('SOV-2.2'), 'choice-3');
    assert.equal(selections.get('SOV-6.5'), 'choice-2');
  });
});

describe('buildFill', () => {
  const alex = buildFill(workbook, 'Alex', {});

  it('is a partial with the three markers', () => {
    assert.deepEqual(alex.meta.participant, { name: 'Alex' });
    assert.deepEqual(alex.claims, CLAIMS);
    assert.deepEqual(alex.partiesAdded, []);
    assert.deepEqual(alex.ledger, []);
    assert.equal(alex.meta.workbookAssessment, 'wa-2026-08-16T00:00:00.000Z');
    assert.equal(alex.meta.workbookId, 'eu-csf-calculator');
    assert.equal(alex.meta.workbookVersion, '1.0.0');
    assert.equal(alex.answers.length, 48);
    for (const answer of alex.answers) {
      assert.deepEqual(answer.target, { kind: 'assessment' });
    }
  });

  it('carries evidence on the synthetic answer only', () => {
    const withEvidence = alex.answers.filter((answer) => 'evidence' in answer);
    assert.equal(withEvidence.length, 1);
    assert.equal(withEvidence[0].questionId, 'SOV-1.6');
    assert.equal(withEvidence[0].evidence, SYNTHETIC_EVIDENCE);
  });

  it('applies Jane’s four changes and copies the rest', () => {
    const jane = buildFill(workbook, 'Jane', JANE_CHANGES);
    const alexById = byQuestion(alex);
    const janeById = byQuestion(jane);

    const compared = (answer) => ({
      state: answer.state,
      rungId: answer.rungId,
      reason: answer.reason,
    });
    const differing = [...janeById.keys()].filter(
      (id) =>
        JSON.stringify(compared(janeById.get(id))) !==
        JSON.stringify(compared(alexById.get(id))),
    );
    assert.deepEqual(differing, ['SOV-1.1', 'SOV-1.2', 'SOV-2.1', 'SOV-2.2']);

    assert.equal(janeById.get('SOV-1.1').rungId, 'choice-3');
    assert.equal(janeById.get('SOV-1.2').rungId, 'choice-4');
    assert.equal(janeById.get('SOV-2.1').state, 'dont-know');
    assert.equal('rungId' in janeById.get('SOV-2.1'), false);
    assert.equal(janeById.get('SOV-2.2').state, 'na');
    assert.equal(janeById.get('SOV-2.2').reason, JANE_CHANGES['SOV-2.2'].reason);
    assert.equal('rungId' in janeById.get('SOV-2.2'), false);

    for (const answer of jane.answers) {
      assert.ok(answer.gesture.groupId.startsWith('jane-'));
    }
  });
});
