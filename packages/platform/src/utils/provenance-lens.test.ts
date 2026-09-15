import { describe, expect, it } from 'vitest';
import { provenanceStrokeClass } from './provenance-lens';

describe('provenanceStrokeClass', () => {
  it('leaves an individually placed stroke solid and unfaded', () => {
    expect(provenanceStrokeClass('individual')).toBe('');
  });

  it('dashes a mixed stroke', () => {
    expect(provenanceStrokeClass('mixed')).toBe('[stroke-dasharray:5_3]');
  });

  it('dashes and fades a swept stroke', () => {
    expect(provenanceStrokeClass('group')).toBe('[stroke-dasharray:5_3] opacity-60');
  });
});
