import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ASSESSMENT_TARGET, AUTHOR_TARGET, } from '../release/contract.js';
export { ASSESSMENT_TARGET, AUTHOR_TARGET } from '../release/contract.js';
export function rendererArtifactUrl(target, location) {
    if (location.kind === 'packaged') {
        return pathToFileURL(join(location.resourcesDirectory, 'renderer', target.rendererFile));
    }
    return new URL(`../../../${target.rendererDirectory}/dist/${target.rendererFile}`, location.desktopDistUrl);
}
