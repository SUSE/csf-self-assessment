import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  decideDesktopHistoryCommand,
  type DesktopHistoryInput,
} from '../src/history-shortcuts.js';

const BACK_INPUT: DesktopHistoryInput = {
  type: 'keyDown',
  key: '[',
  meta: true,
  control: false,
  alt: false,
  shift: false,
};

const FORWARD_INPUT: DesktopHistoryInput = {
  type: 'keyDown',
  key: ']',
  meta: true,
  control: false,
  alt: false,
  shift: false,
};

const IGNORE = { kind: 'ignore' };

test('desktop history shortcuts accept only the two unmodified macOS chords', () => {
  assert.deepEqual(decideDesktopHistoryCommand(BACK_INPUT), { kind: 'back' });
  assert.deepEqual(decideDesktopHistoryCommand(FORWARD_INPUT), {
    kind: 'forward',
  });

  for (const input of [
    { ...BACK_INPUT, type: 'keyUp' },
    { ...BACK_INPUT, meta: false },
    { ...BACK_INPUT, control: true },
    { ...BACK_INPUT, alt: true },
    { ...BACK_INPUT, shift: true },
    { ...BACK_INPUT, key: 'x' },
    { ...FORWARD_INPUT, type: 'keyUp' },
    { ...FORWARD_INPUT, meta: false },
    { ...FORWARD_INPUT, control: true },
    { ...FORWARD_INPUT, alt: true },
    { ...FORWARD_INPUT, shift: true },
    { ...FORWARD_INPUT, key: 'x' },
  ] satisfies DesktopHistoryInput[]) {
    assert.deepEqual(decideDesktopHistoryCommand(input), IGNORE);
  }
});
