import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  ASSESSMENT_TARGET,
  AUTHOR_TARGET,
} from '../release/contract.js';
import { rendererArtifactUrl } from '../src/target.js';
import type { RendererArtifactLocation } from '../src/target.js';

test('the two targets carry the settled identities', () => {
  assert.deepEqual(AUTHOR_TARGET, {
    kind: 'author',
    packageName: 'csf-author',
    applicationId: 'org.csf.selfassessment.author',
    productName: 'CSF Author',
    windowTitle: 'CSF Author',
    rendererDirectory: 'author',
    rendererFile: 'author.html',
    startUrl: 'csf://author/',
    description:
      'Create and test Cloud Sovereignty Self-Assessment workbooks offline.',
  });
  assert.deepEqual(ASSESSMENT_TARGET, {
    kind: 'assessment',
    packageName: 'csf-assessment',
    applicationId: 'org.csf.selfassessment.assessment',
    productName: 'CSF Assessment',
    windowTitle: 'CSF Assessment',
    rendererDirectory: 'assessment',
    rendererFile: 'assessment.html',
    startUrl: 'csf://assessment/',
    description:
      'Complete and review Cloud Sovereignty Self-Assessments offline.',
  });
});

test('renderer artifacts stay paired', () => {
  const workspaceLocation: RendererArtifactLocation = {
    kind: 'workspace',
    desktopDistUrl: new URL('file:///repo/apps/desktop/dist/src/'),
  };
  const authorWorkspaceUrl = rendererArtifactUrl(
    AUTHOR_TARGET,
    workspaceLocation,
  );
  const assessmentWorkspaceUrl = rendererArtifactUrl(
    ASSESSMENT_TARGET,
    workspaceLocation,
  );
  const authorPackagedUrl = rendererArtifactUrl(AUTHOR_TARGET, {
    kind: 'packaged',
    resourcesDirectory: '/proof/CSF Author.app/Contents/Resources',
  });
  const assessmentPackagedUrl = rendererArtifactUrl(ASSESSMENT_TARGET, {
    kind: 'packaged',
    resourcesDirectory: '/proof/CSF Assessment.app/Contents/Resources',
  });

  assert.equal(
    authorWorkspaceUrl.href,
    'file:///repo/apps/author/dist/author.html',
  );
  assert.equal(
    assessmentWorkspaceUrl.href,
    'file:///repo/apps/assessment/dist/assessment.html',
  );
  assert.equal(
    authorPackagedUrl.href,
    'file:///proof/CSF%20Author.app/Contents/Resources/renderer/author.html',
  );
  assert.equal(
    assessmentPackagedUrl.href,
    'file:///proof/CSF%20Assessment.app/Contents/Resources/renderer/assessment.html',
  );

  for (const authorUrl of [authorWorkspaceUrl, authorPackagedUrl]) {
    assert.equal(authorUrl.href.includes('/assessment/'), false);
    assert.equal(authorUrl.href.includes('assessment.html'), false);
  }
  for (const assessmentUrl of [
    assessmentWorkspaceUrl,
    assessmentPackagedUrl,
  ]) {
    assert.equal(assessmentUrl.href.includes('/author/'), false);
    assert.equal(assessmentUrl.href.includes('author.html'), false);
  }
});
