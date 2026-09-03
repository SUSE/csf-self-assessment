import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  ASSESSMENT_TARGET,
  AUTHOR_TARGET,
} from '../release/contract.js';
import type { DesktopApplication } from '../release/contract.js';

export { ASSESSMENT_TARGET, AUTHOR_TARGET } from '../release/contract.js';

export type AuthorDesktopTarget = typeof AUTHOR_TARGET;
export type AssessmentDesktopTarget = typeof ASSESSMENT_TARGET;
export type DesktopTarget = DesktopApplication;

export type RendererArtifactLocation =
  | { kind: 'workspace'; desktopDistUrl: URL }
  | { kind: 'packaged'; resourcesDirectory: string };

export function rendererArtifactUrl(
  target: DesktopTarget,
  location: RendererArtifactLocation,
): URL {
  if (location.kind === 'packaged') {
    return pathToFileURL(
      join(location.resourcesDirectory, 'renderer', target.rendererFile),
    );
  }

  return new URL(
    `../../../${target.rendererDirectory}/dist/${target.rendererFile}`,
    location.desktopDistUrl,
  );
}
