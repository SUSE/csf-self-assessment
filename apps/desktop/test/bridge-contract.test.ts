import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DesktopSaveJsonInputSchema,
  MAX_JSON_FILE_BYTES,
  OpenedJsonFileSchema,
} from '../src/bridge-contract.js';

test('bridge payloads accept only bounded JSON transport', () => {
  const input = { suggestedName: 'estate.json', text: '{"seal":2}' };

  assert.deepEqual(DesktopSaveJsonInputSchema.parse(input), input);
  assert.equal(
    DesktopSaveJsonInputSchema.safeParse({ suggestedName: 'estate.json' }).success,
    false,
  );
  assert.equal(
    DesktopSaveJsonInputSchema.safeParse({
      suggestedName: 'estate.json',
      text: '{}',
      path: '/tmp/estate.json',
    }).success,
    false,
  );
  assert.equal(
    DesktopSaveJsonInputSchema.safeParse({ suggestedName: '.json', text: '{}' }).success,
    false,
  );
  assert.equal(
    DesktopSaveJsonInputSchema.safeParse({ suggestedName: '../estate.json', text: '{}' })
      .success,
    false,
  );
  assert.equal(
    DesktopSaveJsonInputSchema.safeParse({ suggestedName: 'estate.txt', text: '{}' }).success,
    false,
  );
  assert.equal(
    DesktopSaveJsonInputSchema.safeParse({
      suggestedName: `${'é'.repeat(125)}a.json`,
      text: '{}',
    }).success,
    false,
  );
  assert.equal(
    DesktopSaveJsonInputSchema.safeParse({
      suggestedName: 'estate.json',
      text: 'a'.repeat(MAX_JSON_FILE_BYTES + 1),
    }).success,
    false,
  );

  const opened = { name: 'estate.JSON', text: '{}' };
  assert.deepEqual(OpenedJsonFileSchema.parse(opened), opened);
  assert.equal(
    OpenedJsonFileSchema.safeParse({ path: '/tmp/estate.json', text: '{}' }).success,
    false,
  );
});
