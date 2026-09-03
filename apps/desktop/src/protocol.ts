import { readFile } from 'node:fs/promises';

import { protocol } from 'electron';
import type { Session } from 'electron';

import {
  DESKTOP_SCHEME,
  decideRendererRequest,
  rendererResponse,
} from './protocol-policy.js';
import type { DesktopTarget } from './target.js';

export function registerDesktopScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: DESKTOP_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
      },
    },
  ]);
}

export async function installRendererProtocol(
  electronSession: Session,
  target: DesktopTarget,
  rendererArtifactUrl: URL,
): Promise<void> {
  const rendererHtml = await readFile(rendererArtifactUrl);

  electronSession.protocol.handle(DESKTOP_SCHEME, (request) =>
    rendererResponse(
      decideRendererRequest(target, new URL(request.url), rendererHtml),
    ),
  );
}
