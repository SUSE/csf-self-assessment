import type { Seal } from '../../schema';

/** One cell of the strip. `value` is the RADIO GROUP's value, so the host
 *  decides what a pick means. `mark` is what the cell prints — a SEAL digit in
 *  Merge, a rung position in the workbench, because repeated SEALs make the
 *  digit alone name nothing. `label` is the sentence the cell is named by. */
export type SealChoice = {
  seal: Seal;
  value: string;
  mark: string;
  label: string;
};
