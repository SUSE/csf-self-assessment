import type { ContributorShare } from '../../../../analytics';

/** One line of the ranked reading: a contributor, or the tail folded into one. */
export type ContributorRow = {
  key: string;
  label: string;
  units: number;
  fraction: number;
  /** True for the tail row, which names a count of people rather than a person. */
  folded: boolean;
};

/**
 * The head of the ranked list with everything past it folded into one line.
 *
 * `lines` is how many LINES the reading has, not how many contributors it will
 * name: at the limit the last line becomes the tail, so a room of twenty and a
 * room of three are read at the same height. That is the whole point of the
 * fold — a tile is a fixed space and the roster is not bounded by anything.
 */
export function contributorRows(
  contributors: readonly ContributorShare[],
  lines: number,
): ContributorRow[] {
  const row = (share: ContributorShare): ContributorRow => ({
    key: share.name,
    label: share.name,
    units: share.units,
    fraction: share.fraction,
    folded: false,
  });
  if (contributors.length <= lines) return contributors.map(row);

  const head = contributors.slice(0, Math.max(0, lines - 1));
  const tail = contributors.slice(head.length);
  return [
    ...head.map(row),
    {
      key: 'others',
      label: `+${tail.length} others`,
      units: tail.reduce((total, share) => total + share.units, 0),
      fraction: tail.reduce((total, share) => total + share.fraction, 0),
      folded: true,
    },
  ];
}
