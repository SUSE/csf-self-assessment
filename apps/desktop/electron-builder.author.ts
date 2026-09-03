import {
  AUTHOR_TARGET,
  DesktopSystemSchema,
  readPackageTrust,
  readRootReleaseVersion,
} from './release/contract.js';
import { packageConfiguration } from './release/package-config.js';

const version = readRootReleaseVersion(new URL('../../package.json', import.meta.url));
const system = DesktopSystemSchema.parse(
  process.env.CSF_DESKTOP_PACKAGE_SYSTEM,
);

export default packageConfiguration(
  AUTHOR_TARGET,
  version,
  readPackageTrust(process.env),
  system,
);
