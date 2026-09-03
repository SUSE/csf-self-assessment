import { describe, expect, it } from 'vitest';
import {
  inlineNameBudget,
  labelAnchor,
  labelNudge,
  labelRadius,
  ringRadius,
  placeLabels,
  polar,
  spokeAngles,
  truncate,
  LABEL_CHAR_PX,
  LABEL_MAX_CHARS,
  RINGS_EXPOSED,
  RINGS_PLAIN,
  SUB_CHAR_PX,
  WHEEL_VIEWBOX,
} from './geometry';

describe('wheel geometry', () => {
  it('puts the first spoke at 12 o.clock and walks clockwise', () => {
    expect(spokeAngles(4)).toEqual([0, 90, 180, 270]);
    const [x, y] = polar(100, 100, 50, 0);
    expect(Math.round(x)).toBe(100);
    expect(Math.round(y)).toBe(50);
    const [ex, ey] = polar(100, 100, 50, 90);
    expect(Math.round(ex)).toBe(150);
    expect(Math.round(ey)).toBe(100);
  });

  it('anchors labels away from the hub', () => {
    expect(labelAnchor(90)).toBe('start');
    expect(labelAnchor(270)).toBe('end');
    expect(labelAnchor(0)).toBe('middle');
  });

  it('keeps the widest label inside the viewBox on the deepest marker stack', () => {
    const rim = RINGS_EXPOSED[4];
    // Worst realistic stack: a don't-know slot plus two serving parties.
    const labelR = labelRadius(rim, 3);
    const textWidth = LABEL_MAX_CHARS * LABEL_CHAR_PX;
    const rightEdge = WHEEL_VIEWBOX.cx + labelR + 8 + textWidth;
    const leftEdge = WHEEL_VIEWBOX.cx - labelR - 8 - textWidth;
    expect(rightEdge).toBeLessThanOrEqual(WHEEL_VIEWBOX.width);
    expect(leftEdge).toBeGreaterThanOrEqual(0);
    // And vertically: the sub-line under the bottom spoke must clear the floor.
    expect(WHEEL_VIEWBOX.cy + labelR + 10 + 14).toBeLessThanOrEqual(WHEEL_VIEWBOX.height);
    expect(WHEEL_VIEWBOX.cy - labelR - 6).toBeGreaterThanOrEqual(0);
  });

  it('keeps the plain wheel inside the viewBox too', () => {
    const labelR = labelRadius(RINGS_PLAIN[4], 0);
    expect(WHEEL_VIEWBOX.cx + labelR + 8 + LABEL_MAX_CHARS * LABEL_CHAR_PX).toBeLessThanOrEqual(
      WHEEL_VIEWBOX.width,
    );
  });

  it('keeps an inline name+count run inside the viewBox on either wheel', () => {
    // The widest realistic count on the estate wheel, and the deepest label ring.
    for (const labelR of [
      labelRadius(RINGS_PLAIN[4], 0),
      labelRadius(RINGS_EXPOSED[4], 3),
    ]) {
      for (const sub of ['0 of 9', '128 of 128', 'SEAL-0 · 3 unknowns']) {
        const budget = inlineNameBudget(labelR, sub);
        const run = budget * LABEL_CHAR_PX + 8 + sub.length * SUB_CHAR_PX;
        expect(WHEEL_VIEWBOX.cx + labelR + 8 + run).toBeLessThanOrEqual(WHEEL_VIEWBOX.width);
      }
    }
  });

  it('spends the label budget two ways — a longer count buys a shorter name', () => {
    const labelR = labelRadius(RINGS_PLAIN[4], 0);
    expect(inlineNameBudget(labelR, '0 of 9')).toBeGreaterThan(
      inlineNameBudget(labelR, '128 of 128'),
    );
    // Never wider than a name alone is allowed to be, never narrower than a stub.
    expect(inlineNameBudget(labelR, '')).toBeLessThanOrEqual(LABEL_MAX_CHARS);
    expect(inlineNameBudget(labelR, 'x'.repeat(200))).toBe(6);
  });

  it('truncates a long authored name and leaves short ones alone', () => {
    expect(truncate('Compute')).toBe('Compute');
    expect(truncate('Platform (containers & PaaS)')).toBe('Platform (container…');
    expect(truncate('Platform (containers & PaaS)').length).toBe(LABEL_MAX_CHARS);
  });
});

describe('placeLabels', () => {
  const CX = WHEEL_VIEWBOX.cx;
  const CY = WHEEL_VIEWBOX.cy;
  const R = labelRadius(RINGS_PLAIN[4], 0);
  // Nine dimensions fan the right arc (the crowding case from the overview),
  // parties fan the left, the assessment chip sits alone at 12 o'clock.
  const rightArc = Array.from({ length: 9 }, (_, i) => ({ deg: (180 * (i + 1)) / 10, r: R }));
  const leftArc = Array.from({ length: 4 }, (_, i) => ({ deg: 180 + (180 * (i + 1)) / 5, r: R }));

  const minGapOf = (labels: { y: number }[], keep: (i: number) => boolean): number => {
    const ys = labels.filter((_, i) => keep(i)).map((l) => l.y).sort((a, b) => a - b);
    return ys.slice(1).reduce((min, y, i) => Math.min(min, y - ys[i]), Infinity);
  };

  it('anchors each label away from the hub — start right, end left, middle at a pole', () => {
    const labels = placeLabels([{ deg: 0, r: R }, { deg: 90, r: R }, { deg: 270, r: R }], CX, CY);
    expect(labels.map((l) => l.anchor)).toEqual(['middle', 'start', 'end']);
  });

  it('opens crowded poles so no two same-side labels stack closer than the min gap', () => {
    const items = [{ deg: 0, r: R }, ...rightArc, ...leftArc];
    const labels = placeLabels(items, CX, CY, { minGap: 34 });
    // Right arc is indices 1..9, left arc 10..13.
    expect(minGapOf(labels, (i) => i >= 1 && i <= 9)).toBeGreaterThanOrEqual(34 - 1e-6);
    expect(minGapOf(labels, (i) => i >= 10 && i <= 13)).toBeGreaterThanOrEqual(34 - 1e-6);
  });

  it('leaves an already-roomy side untouched (minimal movement)', () => {
    // Four spokes on the right arc sit ~40px apart in y — well clear of a 34 gap.
    const roomy = placeLabels(leftArc.map((it) => ({ ...it, deg: it.deg - 180 })), CX, CY, { minGap: 34 });
    const bare = leftArc.map((it) => polar(CX, CY, R, it.deg - 180)[1]);
    roomy.forEach((l, i) => expect(l.y).toBeCloseTo(bare[i], 6));
  });

  it('keeps the two opposite arcs independent — a right label never shoves a left one', () => {
    const rightOnly = placeLabels([{ deg: 0, r: R }, ...rightArc], CX, CY, { minGap: 34 });
    const both = placeLabels([{ deg: 0, r: R }, ...rightArc, ...leftArc], CX, CY, { minGap: 34 });
    // The right-arc placements are the same whether or not the left arc is present.
    rightOnly.slice(1).forEach((l, i) => expect(both[i + 1].y).toBeCloseTo(l.y, 6));
  });

  it('preserves the column mean, so a spread pole neither drifts up nor down', () => {
    const before = rightArc.map((it) => polar(CX, CY, R, it.deg)[1]);
    const after = placeLabels(rightArc, CX, CY, { minGap: 34 }).map((l) => l.y);
    const mean = (xs: number[]): number => xs.reduce((s, x) => s + x, 0) / xs.length;
    expect(mean(after)).toBeCloseTo(mean(before), 6);
  });

  it('shrinks the gap rather than marching a dense wheel off the viewBox', () => {
    // Twenty spokes over the right arc can't all clear a 34px gap; the column is
    // capped to maxSpan instead of overflowing the chart.
    const dense = Array.from({ length: 20 }, (_, i) => ({ deg: (180 * (i + 1)) / 21, r: R }));
    const maxSpan = WHEEL_VIEWBOX.height - 72;
    const ys = placeLabels(dense, CX, CY, { minGap: 34, maxSpan }).map((l) => l.y);
    const span = Math.max(...ys) - Math.min(...ys);
    expect(span).toBeLessThanOrEqual(maxSpan + 1e-6);
  });
});

describe('labelNudge', () => {
  it('shoves the pole labels vertically off their own anchor', () => {
    expect(labelNudge(0)).toEqual({ dx: 0, dy: -6 });
    expect(labelNudge(180)).toEqual({ dx: 0, dy: 10 });
  });

  it('shoves the side labels tangentially', () => {
    expect(labelNudge(90)).toEqual({ dx: 8, dy: 2 });
    expect(labelNudge(270)).toEqual({ dx: -8, dy: 2 });
  });

  it('applies both components at once off the poles', () => {
    expect(labelNudge(45)).toEqual({ dx: 8, dy: -6 });
    expect(labelNudge(135)).toEqual({ dx: 8, dy: 10 });
  });
});

describe('ringRadius', () => {
  it('indexes a ring set by seal with no fallback', () => {
    expect(ringRadius(RINGS_PLAIN, 0)).toBe(44);
    expect(ringRadius(RINGS_EXPOSED, 4)).toBe(116);
  });
});
