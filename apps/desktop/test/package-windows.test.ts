import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { access, mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { z } from 'zod';

import {
  ASSESSMENT_TARGET,
  AUTHOR_TARGET,
  packageAssetName,
  readPackageTrust,
  readRootReleaseVersion,
} from '../release/contract.js';
import type {
  DesktopApplication,
  PackageTarget,
} from '../release/contract.js';
import { desktopUserDataPath } from '../src/profile.js';
import {
  assertPackagedComposition,
  assertPackagedRuntime,
} from './package-harness.js';
import type { PackagedApplication } from './package-harness.js';

const execFileAsync = promisify(execFile);
const REPOSITORY_DIRECTORY = fileURLToPath(new URL('../../../', import.meta.url));
const VERSION = readRootReleaseVersion(
  new URL('../../../package.json', import.meta.url),
);
const TRUST = readPackageTrust(process.env);
const WINDOWS_TARGET: PackageTarget = {
  system: 'windows',
  cpu: 'x64',
  format: 'nsis',
  extension: 'exe',
};
const InstallationSchema = z
  .object({
    installDirectory: z.string().min(1),
    executablePath: z.string().min(1),
    uninstallerPath: z.string().min(1),
  })
  .strict();
const AuthenticodeSchema = z
  .object({
    status: z.literal('Valid'),
    subject: z.string().min(1),
    thumbprint: z.string().regex(/^[0-9A-F]{40}$/),
    timestamp: z.string().min(1),
  })
  .strict();

type Installation = z.infer<typeof InstallationSchema>;
type Authenticode = z.infer<typeof AuthenticodeSchema>;

function windowsEnvironment(
  profileDirectory: string,
): Readonly<Record<string, string>> {
  const appData = join(profileDirectory, 'AppData', 'Roaming');
  const localAppData = join(profileDirectory, 'AppData', 'Local');
  return {
    HOME: profileDirectory,
    USERPROFILE: profileDirectory,
    APPDATA: appData,
    LOCALAPPDATA: localAppData,
    TEMP: join(profileDirectory, 'Temp'),
    TMP: join(profileDirectory, 'Temp'),
  };
}

async function installationFor(
  app: DesktopApplication,
  environment: Readonly<Record<string, string>>,
): Promise<Installation> {
  const script = [
    `$entry = $null`,
    `for ($attempt = 0; $attempt -lt 120 -and $null -eq $entry; $attempt += 1) { $entry = Get-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*' | Where-Object { $_.DisplayName -eq '${app.productName} ${VERSION}' } | Select-Object -First 1; if ($null -eq $entry) { Start-Sleep -Milliseconds 250 } }`,
    `if ($null -eq $entry) { throw 'Missing uninstall record' }`,
    `$displayIcon = [string]$entry.DisplayIcon`,
    `$executablePath = ($displayIcon.Trim('"') -replace ',[0-9]+$','')`,
    `$uninstall = [string]$entry.UninstallString`,
    `$quoted = [regex]::Match($uninstall, '^"([^"]+)"')`,
    `$uninstallerPath = if ($quoted.Success) { $quoted.Groups[1].Value } else { $uninstall }`,
    `$installDirectory = Split-Path -Parent $executablePath`,
    `@{ installDirectory = $installDirectory; executablePath = $executablePath; uninstallerPath = $uninstallerPath } | ConvertTo-Json -Compress`,
  ].join('; ');
  const result = await execFileAsync(
    'pwsh.exe',
    ['-NoProfile', '-NonInteractive', '-Command', script],
    { env: { ...process.env, ...environment } },
  );
  return InstallationSchema.parse(JSON.parse(result.stdout));
}

function packagedApplication(
  app: DesktopApplication,
  installation: Installation,
): PackagedApplication {
  const resourcesDirectory = join(dirname(installation.executablePath), 'resources');
  return {
    app,
    executablePath: installation.executablePath,
    resourcesDirectory,
    sourceRendererPath: join(
      REPOSITORY_DIRECTORY,
      `apps/${app.rendererDirectory}/dist/${app.rendererFile}`,
    ),
    packagedRendererPath: join(
      resourcesDirectory,
      `renderer/${app.rendererFile}`,
    ),
    absentRendererPath: join(
      resourcesDirectory,
      'renderer',
      app.kind === 'author' ? 'assessment.html' : 'author.html',
    ),
  };
}

async function assertUnsigned(file: string): Promise<void> {
  const result = await execFileAsync('pwsh.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    `(Get-AuthenticodeSignature -LiteralPath '${file}').Status.ToString()`,
  ]);
  assert.equal(result.stdout.trim(), 'NotSigned');
}

async function authenticodeFor(file: string): Promise<Authenticode> {
  const script = [
    `$signature = Get-AuthenticodeSignature -LiteralPath '${file}'`,
    `@{ status = [string]$signature.Status.ToString(); subject = [string]$signature.SignerCertificate.Subject; thumbprint = [string]$signature.SignerCertificate.Thumbprint; timestamp = [string]$signature.TimeStamperCertificate.Subject } | ConvertTo-Json -Compress`,
  ].join('; ');
  const result = await execFileAsync('pwsh.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    script,
  ]);
  return AuthenticodeSchema.parse(JSON.parse(result.stdout));
}

async function waitForRemoval(directory: string): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      await access(directory);
    } catch {
      return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 250));
  }
  await assert.rejects(access(directory));
}

test(
  'Windows installers prove install, runtime, bridge, and uninstall for both apps',
  { skip: process.platform !== 'win32' },
  async () => {
    const userDataPaths: string[] = [];

    for (const app of [AUTHOR_TARGET, ASSESSMENT_TARGET]) {
      const installerPath = join(
        REPOSITORY_DIRECTORY,
        `dist/desktop/${app.kind}`,
        packageAssetName(app.kind, WINDOWS_TARGET, VERSION),
      );
      await access(installerPath);
      const installerTrust =
        TRUST === 'signed-candidate'
          ? await authenticodeFor(installerPath)
          : undefined;
      if (installerTrust === undefined) {
        await assertUnsigned(installerPath);
      }

      const profileDirectory = await mkdtemp(
        join(tmpdir(), `csf-desktop-windows-install-${app.kind}-`),
      );
      const environment = windowsEnvironment(profileDirectory);
      await Promise.all([
        mkdir(environment.APPDATA ?? '', { recursive: true }),
        mkdir(environment.LOCALAPPDATA ?? '', { recursive: true }),
        mkdir(environment.TEMP ?? '', { recursive: true }),
      ]);
      let installation: Installation | undefined;
      try {
        await execFileAsync(installerPath, ['/S'], {
          env: { ...process.env, ...environment },
        });
        installation = await installationFor(app, environment);
        await Promise.all([
          access(installation.installDirectory),
          access(installation.executablePath),
          access(installation.uninstallerPath),
        ]);
        const packaged = packagedApplication(app, installation);
        await assertPackagedComposition(packaged, VERSION);
        const userDataPath = await assertPackagedRuntime(packaged, VERSION, {
          executablePath: packaged.executablePath,
          homeDirectory: await mkdtemp(
            join(tmpdir(), `csf-desktop-windows-runtime-${app.kind}-`),
          ),
          arguments: [],
          environment,
        });
        assert.equal(
          userDataPath,
          desktopUserDataPath(app, join(profileDirectory, 'AppData', 'Roaming')),
        );
        assert.equal(userDataPath.endsWith(app.applicationId), true);
        userDataPaths.push(userDataPath);

        if (installerTrust !== undefined) {
          for (const path of [
            installation.executablePath,
            installation.uninstallerPath,
          ]) {
            const trust = await authenticodeFor(path);
            assert.equal(trust.subject, installerTrust.subject);
            assert.equal(trust.thumbprint, installerTrust.thumbprint);
          }
        }
      } finally {
        if (installation !== undefined) {
          await execFileAsync(installation.uninstallerPath, ['/S'], {
            env: { ...process.env, ...environment },
          });
          await waitForRemoval(installation.installDirectory);
        }
        await rm(profileDirectory, {
          recursive: true,
          force: true,
          maxRetries: 120,
          retryDelay: 250,
        });
      }
    }

    assert.equal(userDataPaths.length, 2);
    assert.notEqual(userDataPaths[0], userDataPaths[1]);
  },
);
