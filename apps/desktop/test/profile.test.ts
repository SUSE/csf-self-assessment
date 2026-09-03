import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  configureDesktopIdentity,
  desktopUserDataPath,
  type DesktopIdentityHost,
} from '../src/profile.js';
import { ASSESSMENT_TARGET, AUTHOR_TARGET } from '../src/target.js';

test('desktop profiles derive from the application id', () => {
  const authorPath = desktopUserDataPath(AUTHOR_TARGET, '/profiles');
  const assessmentPath = desktopUserDataPath(ASSESSMENT_TARGET, '/profiles');

  assert.equal(authorPath, '/profiles/org.csf.selfassessment.author');
  assert.equal(
    assessmentPath,
    '/profiles/org.csf.selfassessment.assessment',
  );
  assert.notEqual(authorPath, assessmentPath);
});

test('desktop identity is configured before startup', () => {
  const pathReads: string[] = [];
  const nameCalls: string[] = [];
  const appModelIdCalls: string[] = [];
  const pathCalls: Array<readonly [string, string]> = [];
  const fake: DesktopIdentityHost = {
    getPath(name) {
      pathReads.push(name);
      return '/profiles';
    },
    setName(name) {
      nameCalls.push(name);
    },
    setAppUserModelId(id) {
      appModelIdCalls.push(id);
    },
    setPath(name, path) {
      pathCalls.push([name, path]);
    },
  };

  configureDesktopIdentity(fake, AUTHOR_TARGET);

  assert.deepEqual(pathReads, ['appData']);
  assert.deepEqual(nameCalls, ['CSF Author']);
  assert.deepEqual(appModelIdCalls, ['org.csf.selfassessment.author']);
  assert.deepEqual(pathCalls, [
    ['userData', '/profiles/org.csf.selfassessment.author'],
  ]);
});
