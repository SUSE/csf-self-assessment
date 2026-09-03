import { join } from 'node:path';
export function desktopUserDataPath(target, appDataPath) {
    return join(appDataPath, target.applicationId);
}
export function configureDesktopIdentity(host, target) {
    host.setName(target.productName);
    host.setAppUserModelId(target.applicationId);
    host.setPath('userData', desktopUserDataPath(target, host.getPath('appData')));
}
