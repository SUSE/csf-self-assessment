import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import {
  ALEX_PATH,
  buildAlex,
  buildJane,
  JANE_COMPUTE_STRATA,
  JANE_DIVERGENCES,
  JANE_GAPS,
  JANE_PATH,
  JANE_SCOPE_EXCLUSIONS,
  SEEDED_PARTY,
  WORKBOOK_ASSESSMENT_ID,
  WORKBOOK_PATH,
  baseSelections,
} from './ec-calculator-deep-fills.mjs';

const workbook = JSON.parse(readFileSync(WORKBOOK_PATH, 'utf8'));
const alex = buildAlex(workbook);
const jane = buildJane(workbook);
const selections = baseSelections(workbook);

const at = (fill, questionId, target) =>
  fill.answers.find(
    (a) => a.questionId === questionId && JSON.stringify(a.target) === JSON.stringify(target),
  );

describe('the deep fills', () => {
  it('share one lineage and seed only the assessed organisation', () => {
    for (const fill of [alex, jane]) {
      assert.equal(fill.meta.workbookId, 'eu-csf-calculator-deep');
      assert.equal(fill.meta.workbookAssessment, WORKBOOK_ASSESSMENT_ID);
      assert.deepEqual(fill.parties, [SEEDED_PARTY]);
      assert.deepEqual(fill.ledger, []);
    }
    assert.equal(alex.meta.participant.name, 'Alex');
    assert.equal(jane.meta.participant.name, 'Jane');
  });

  it('name one provider twice — the collision the facilitator absorbs', () => {
    const ids = (fill) => fill.partiesAdded.map((p) => p.id);
    assert.deepEqual(ids(alex), ['helios-cloud', 'secops-eu', 'siliconware']);
    assert.deepEqual(ids(jane), ['helios-europe', 'secops-eu', 'rhine-estate']);
  });

  it('Alex sweeps his roster; Jane stays inside her scope', () => {
    assert.equal(alex.answers.length, 193);
    assert.equal(jane.answers.length, 145);
  });

  it('both put the assessed organisation out of scope on the entity questions', () => {
    for (const fill of [alex, jane]) {
      const self = fill.answers.filter(
        (a) => a.target.kind === 'party' && a.target.party === SEEDED_PARTY.id,
      );
      assert.equal(self.length, 9);
      assert.ok(self.every((a) => a.state === 'na'));
    }
  });

  it('every declared divergence really differs from Alex', () => {
    assert.equal(JANE_DIVERGENCES.length, 6);
    for (const { questionId, target, rungId } of JANE_DIVERGENCES) {
      assert.equal(at(jane, questionId, target).rungId, rungId);
      assert.equal(at(alex, questionId, target).rungId, selections.get(questionId));
      assert.notEqual(rungId, selections.get(questionId));
    }
  });

  it('the gaps and scope exclusions sit on units Alex answered', () => {
    assert.equal(JANE_GAPS.length, 4);
    assert.equal(JANE_SCOPE_EXCLUSIONS.length, 2);
    for (const { questionId, target } of JANE_GAPS) {
      assert.equal(at(jane, questionId, target).state, 'dont-know');
      assert.equal(at(alex, questionId, target).state, 'answered');
    }
    for (const { questionId, target, reason } of JANE_SCOPE_EXCLUSIONS) {
      assert.equal(at(jane, questionId, target).state, 'na');
      assert.equal(at(jane, questionId, target).reason, reason);
      assert.equal(at(alex, questionId, target).state, 'answered');
    }
  });

  it('Jane splits compute into the four layer boxes Alex rolled up', () => {
    const { questionId, dimension } = JANE_COMPUTE_STRATA;
    assert.ok(at(alex, questionId, { kind: 'dimension', dimension }));
    assert.equal(at(jane, questionId, { kind: 'dimension', dimension }), undefined);
    const strata = jane.answers.filter(
      (a) => a.questionId === questionId && a.target.kind === 'dimension-stratum',
    );
    assert.deepEqual(
      strata.map((a) => a.target.stratum),
      ['service', 'software', 'hardware', 'chips'],
    );
    assert.deepEqual(
      strata.map((a) => a.rungId),
      Object.values(JANE_COMPUTE_STRATA.rungs),
    );
  });

  it('match the committed samples', () => {
    assert.deepEqual(alex, JSON.parse(readFileSync(ALEX_PATH, 'utf8')));
    assert.deepEqual(jane, JSON.parse(readFileSync(JANE_PATH, 'utf8')));
  });
});
