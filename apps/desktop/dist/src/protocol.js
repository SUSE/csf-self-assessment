import { readFile } from 'node:fs/promises';
import { protocol } from 'electron';
import { DESKTOP_SCHEME, decideRendererRequest, rendererResponse, } from './protocol-policy.js';
export function registerDesktopScheme() {
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
export async function installRendererProtocol(electronSession, target, rendererArtifactUrl) {
    const rendererHtml = await readFile(rendererArtifactUrl);
    electronSession.protocol.handle(DESKTOP_SCHEME, (request) => rendererResponse(decideRendererRequest(target, new URL(request.url), rendererHtml)));
}
