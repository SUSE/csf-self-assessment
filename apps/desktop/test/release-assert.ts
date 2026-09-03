import assert from 'node:assert/strict';

import { ReleaseError } from '../release/contract.js';

export async function assertReleaseFailure(
  run: () => void | Promise<void>,
  failure: ReleaseError['failure'],
): Promise<void> {
  await assert.rejects(
    async () => {
      await run();
    },
    (error: Error) => {
      assert.ok(error instanceof ReleaseError);
      assert.deepEqual(error.failure, failure);
      return true;
    },
  );
}
