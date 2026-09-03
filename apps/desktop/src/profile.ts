import { join } from 'node:path';

import type { App } from 'electron';

import type { DesktopTarget } from './target.js';

export type DesktopIdentityHost = Pick<
  App,
  'getPath' | 'setAppUserModelId' | 'setName' | 'setPath'
>;

export function desktopUserDataPath(
  target: DesktopTarget,
  appDataPath: string,
): string {
  return join(appDataPath, target.applicationId);
}

export function configureDesktopIdentity(
  host: DesktopIdentityHost,
  target: DesktopTarget,
): void {
  host.setName(target.productName);
  host.setAppUserModelId(target.applicationId);
  host.setPath(
    'userData',
    desktopUserDataPath(target, host.getPath('appData')),
  );
}
