import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { WorkbookSchema } from '../../schema';
import type { Answer, Question, Seal, Target } from '../../schema';
import { questionOf, targetKey } from '../../assessment';
import type { Chip, FanoutUnit } from './types';
import {
  chipsFor,
  evidenceIn,
  lastAnsweredGroup,
  lastNaGroup,
  renderGroups,
  resolvedCount,
  restingOff,
  restingOnRung,
  trayCopy,
  unplaced,
} from './model';

const SAMPLE = fileURLToPath(new URL('../../../../../samples/csf-workbook.json', import.meta.url));
const WB = WorkbookSchema.parse(JSON.parse(readFileSync(SAMPLE, 'utf8')));

// SOV-4.kill-switch again (the sibling wheel test's specimen): it fans over
// compute — the one strata-splittable dimension here — and platform.
function question(id: string): Question {
  for (const objective of WB.objectives) {
    const found = objective.questions.find((q) => q.id === id);
    if (found) return found;
  }
  throw new Error(`no question ${id}`);
}
const KILL = question('SOV-4.kill-switch');

function dimensionName(id: string): string {
  const found = WB.dimensions.find((d) => d.id === id);
  if (!found) throw new Error(`no dimension ${id}`);
  return found.name;
}
const rungIdFor = (seal: Seal): string => {
  const rung = questionOf(WB, KILL.id)?.ladder.find((r) => r.seal === seal);
  if (!rung) throw new Error(`no rung at SEAL ${seal}`);
  return rung.id;
};

const dim = (dimension: string): Target => ({ kind: 'dimension', dimension });
const stratum = (dimension: string, s: string): Target => ({
  kind: 'dimension-stratum',
  dimension,
  stratum: s,
});

const STRATA = ['service', 'software', 'hardware', 'chips'] as const;
const PLATFORM: FanoutUnit = {
  key: targetKey(dim('platform')),
  label: dimensionName('platform'),
  critical: true,
  target: dim('platform'),
};
const COMPUTE: FanoutUnit = {
  key: targetKey(dim('compute')),
  label: dimensionName('compute'),
  critical: true,
  target: dim('compute'),
  strata: STRATA.map((s) => ({
    key: targetKey(stratum('compute', s)),
    label: `${dimensionName('compute')} · ${s}`,
    short: s,
    target: stratum('compute', s),
  })),
};
const UNITS: FanoutUnit[] = [PLATFORM, COMPUTE];

function answered(target: Target, seal: Seal, groupId: string): Answer {
  return {
    questionId: KILL.id,
    target,
    state: 'answered',
    rungId: rungIdFor(seal),
    gesture: { groupId, placement: 'individual' },
  };
}
function answeredWithEvidence(
  target: Target,
  seal: Seal,
  groupId: string,
  evidence: string,
): Answer {
  return {
    questionId: KILL.id,
    target,
    state: 'answered',
    rungId: rungIdFor(seal),
    evidence,
    gesture: { groupId, placement: 'individual' },
  };
}
function dontKnow(target: Target, groupId: string): Answer {
  return { questionId: KILL.id, target, state: 'dont-know', gesture: { groupId, placement: 'individual' } };
}
function notApplicable(target: Target, groupId: string, reason: string): Answer {
  return {
    questionId: KILL.id,
    target,
    state: 'na',
    reason,
    gesture: { groupId, placement: 'individual' },
  };
}

const SPLIT_CHIPS = (): Chip[] => chipsFor(KILL, UNITS, [], [COMPUTE.key]);

describe('chipsFor', () => {
  it('is one chip per whole unit when nothing is split', () => {
    const chips = chipsFor(KILL, UNITS, [], []);
    expect(chips.map((c) => c.key)).toEqual([PLATFORM.key, COMPUTE.key]);
    expect(chips.map((c) => c.answer)).toEqual([undefined, undefined]);
    expect(chips.map((c) => c.isStratum)).toEqual([false, false]);
    expect(chips.map((c) => c.splittable)).toEqual([false, true]);
  });

  it('peels a unit named in splitIntents into its strata', () => {
    const chips = SPLIT_CHIPS();
    expect(chips.map((c) => c.key)).toEqual([
      PLATFORM.key,
      ...STRATA.map((s) => targetKey(stratum('compute', s))),
    ]);
    const strata = chips.slice(1);
    expect(strata.map((c) => c.isStratum)).toEqual([true, true, true, true]);
    expect(strata.map((c) => c.splittable)).toEqual([true, true, true, true]);
    expect(strata.map((c) => c.unitKey)).toEqual([COMPUTE.key, COMPUTE.key, COMPUTE.key, COMPUTE.key]);
    expect(strata.map((c) => c.short)).toEqual([...STRATA]);
  });

  it('splits a unit that already carries a stratum answer, with no intent', () => {
    const chips = chipsFor(KILL, UNITS, [answered(stratum('compute', 'chips'), 2, 'g1')], []);
    expect(chips.map((c) => c.key)).toEqual([
      PLATFORM.key,
      ...STRATA.map((s) => targetKey(stratum('compute', s))),
    ]);
  });
});

describe('unplaced / resolvedCount', () => {
  it('splits the chips into the untouched and the dealt-with', () => {
    const chips = chipsFor(
      KILL,
      UNITS,
      [answered(stratum('compute', 'service'), 1, 'g1'), dontKnow(stratum('compute', 'chips'), 'g2')],
      [],
    );
    expect(unplaced(chips).map((c) => c.short)).toEqual([
      dimensionName('platform'),
      'software',
      'hardware',
    ]);
    expect(unplaced(chips).every((c) => c.answer === undefined)).toBe(true);
    expect(resolvedCount(chips)).toBe(chips.length - unplaced(chips).length);
    expect(resolvedCount(chips)).toBe(2);
  });
});

describe('restingOnRung / restingOff', () => {
  it('rests each chip in the bin its own answer names', () => {
    const chips = chipsFor(
      KILL,
      UNITS,
      [
        answered(stratum('compute', 'service'), 1, 'g1'),
        answered(stratum('compute', 'software'), 3, 'g2'),
        dontKnow(stratum('compute', 'hardware'), 'g3'),
        notApplicable(stratum('compute', 'chips'), 'g4', 'no silicon of our own'),
      ],
      [],
    );
    expect(restingOnRung(chips, rungIdFor(1)).map((c) => c.short)).toEqual(['service']);
    expect(restingOnRung(chips, rungIdFor(3)).map((c) => c.short)).toEqual(['software']);
    expect(restingOff(chips, 'dont-know').map((c) => c.short)).toEqual(['hardware']);
    expect(restingOff(chips, 'na').map((c) => c.short)).toEqual(['chips']);
  });
});

describe('trayCopy', () => {
  const noun = { one: 'dimension', many: 'dimensions' };

  it('counts what is left to place when no chip is selected', () => {
    expect(trayCopy(null, 2, noun).title).toBe('2 dimensions to place');
    expect(trayCopy(null, 1, noun).title).toBe('1 dimension to place');
  });

  it('names the selected chip and switches the hint to tap-a-target', () => {
    const chip = chipsFor(KILL, UNITS, [], [])[0];
    if (chip === undefined) throw new Error('no chip');
    const copy = trayCopy(chip, 2, noun);
    expect(copy.title).toBe(`${chip.label} selected`);
    expect(copy.hint).toBe('Tap a rung or an off-ladder row — or just drag it there.');
    expect(trayCopy(null, 2, noun).hint).toBe(
      'Drag each onto a rung, or onto Nobody knows / Doesn’t apply.',
    );
  });
});

describe('lastAnsweredGroup / evidenceIn', () => {
  it('is the highest-numbered answered group, whatever order the answers arrive in', () => {
    const answers = [
      answeredWithEvidence(dim('platform'), 3, 'g3', 'the runbook'),
      answered(stratum('compute', 'service'), 1, 'g1'),
    ];
    expect(lastAnsweredGroup(KILL, answers)).toEqual({ groupId: 'g3', seal: 3 });
    expect(evidenceIn(KILL, answers, 'g3')).toBe('the runbook');
  });

  it('is null when nothing is answered, and evidence is empty when none is recorded', () => {
    const answers = [dontKnow(dim('platform'), 'g1')];
    expect(lastAnsweredGroup(KILL, answers)).toBeNull();
    expect(evidenceIn(KILL, [answered(dim('platform'), 2, 'g3')], 'g3')).toBe('');
  });
});

describe('lastNaGroup', () => {
  it('is the highest-numbered n/a group, with the label of the chip it names', () => {
    const answers = [
      notApplicable(stratum('compute', 'chips'), 'g1', 'no silicon'),
      notApplicable(dim('platform'), 'g2', 'no platform of our own'),
    ];
    const chips = chipsFor(KILL, UNITS, answers, []);
    expect(lastNaGroup(KILL, answers, chips)).toEqual({
      groupId: 'g2',
      reason: 'no platform of our own',
      label: dimensionName('platform'),
    });
  });

  it('is null when no answer is n/a', () => {
    expect(lastNaGroup(KILL, [answered(dim('platform'), 1, 'g1')], [])).toBeNull();
  });
});

describe('renderGroups', () => {
  it('collapses a split unit into one segmented pill and leaves whole chips plain', () => {
    const all = SPLIT_CHIPS();
    const service = all.find((c) => c.short === 'service');
    const hardware = all.find((c) => c.short === 'hardware');
    const platform = all.find((c) => c.key === PLATFORM.key);
    if (!service || !hardware || !platform) throw new Error('missing chip');

    const groups = renderGroups([service, hardware, platform], all, UNITS, true);
    expect(groups).toHaveLength(2);
    const [grouped, plain] = groups;
    if (grouped === undefined || plain === undefined) throw new Error('missing group');
    if (!grouped.grouped) throw new Error('expected a grouped entry');
    expect(grouped.unitKey).toBe(COMPUTE.key);
    expect(grouped.name).toBe(dimensionName('compute'));
    expect(grouped.segs.map((c) => c.short)).toEqual(['service', 'hardware']);
    expect(grouped.fraction).toBe('2/4');
    if (plain.grouped) throw new Error('expected a plain entry');
    expect(plain.chip.key).toBe(PLATFORM.key);
    expect(plain.strataCount).toBe(0);
  });

  it('drops the fraction outside a rung fragment', () => {
    const all = SPLIT_CHIPS();
    const service = all.find((c) => c.short === 'service');
    if (!service) throw new Error('missing chip');
    const [grouped] = renderGroups([service], all, UNITS, false);
    if (grouped === undefined || !grouped.grouped) throw new Error('expected a grouped entry');
    expect(grouped.fraction).toBeNull();
  });
});
