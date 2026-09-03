import type { Seal, Workbook } from '../schema';
import { scores, type EngineResult } from '../score-engine';

/** Absence is never a zero (analytics invariant #2): an estate with no gating
 *  answer has no floor, which is a different statement from SEAL-0. */
export type FloorStanding =
  | { kind: 'sealed'; seal: Seal; name: string; description: string }
  | { kind: 'not-assessed' };

export type FloorTile = {
  standing: FloorStanding;
  /** Floor HOLES — material don't-knows that would gate — kept distinct from the
   *  don't-know grand total (product invariant #5). */
  unknowns: number;
};

/** The tile reads the floor and its one level. The whole authored ladder is a
 *  WORKBOOK fact, not a reading, so the Inspector's SealLadder takes
 *  `workbook.sealLevels` directly rather than a copy carried through here. */
export function floorTile(result: EngineResult, workbook: Workbook): FloorTile {
  const floor = result.overall.floor;
  const level = workbook.sealLevels.find((l) => l.seal === floor);
  return {
    standing:
      level === undefined
        ? { kind: 'not-assessed' }
        : {
            kind: 'sealed',
            seal: level.seal,
            name: level.name,
            description: level.description,
          },
    unknowns: result.overall.unknowns.length,
  };
}

/** Same rule as the floor: no scoring answer yet is not a score of zero. */
export type ScoreStanding = { kind: 'scored'; score: number } | { kind: 'not-assessed' };

export type ScoreTile = {
  standing: ScoreStanding;
  /** SCORING units with no answer yet — `material` or `ranking`. Answering them
   *  can only raise the score while the unit set holds (analytics §2.1.2).
   *  Renamed from `openMaterial`. */
  openScoring: number;
  /** What could still move the number. */
  openNote: string;
  /** Why a rank is not a floor. */
  caption: string;
  /** The floor this rank sits above — the score is painted in its seal, so the
   *  two are read together and a rank never looks better than its gate. Null
   *  when nothing gates yet, which is not SEAL-0 (invariant #2). */
  floor: Seal | null;
};

const SCORE_CAPTION = 'Ranks above the floor — never a substitute for it.';

const NOT_ASSESSED =
  'Nothing scoring answered yet — a score needs at least one material or ranking answer.';

export function scoreTile(result: EngineResult): ScoreTile {
  const score = result.overall.score;
  const openScoring = result.openUnits.filter((unit) => scores(unit.materiality)).length;
  return {
    standing: score === null ? { kind: 'not-assessed' } : { kind: 'scored', score },
    openScoring,
    openNote:
      openScoring === 0
        ? 'Every scoring unit is answered — this number moves only if the estate does.'
        : `${openScoring} scoring ${openScoring === 1 ? 'unit is' : 'units are'} still unanswered — answering them can only move this number up.`,
    caption: score === null ? NOT_ASSESSED : SCORE_CAPTION,
    floor: result.overall.floor,
  };
}
