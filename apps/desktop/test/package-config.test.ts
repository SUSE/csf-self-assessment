import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  ASSESSMENT_TARGET,
  AUTHOR_TARGET,
  ReleaseVersionSchema,
} from '../release/contract.js';
import type { PackageTrust } from '../release/contract.js';
import { packageConfiguration } from '../release/package-config.js';

const VERSION = ReleaseVersionSchema.parse('0.1.0-rc.1');
const UNSIGNED_TRUSTS: readonly PackageTrust[] = [
  'local-proof',
  'unsigned-candidate',
];

test('package configuration keeps exact common release metadata', () => {
  for (const trust of UNSIGNED_TRUSTS) {
    for (const app of [AUTHOR_TARGET, ASSESSMENT_TARGET]) {
      const config = packageConfiguration(app, VERSION, trust, 'macos');
      const siblingEntry = app.kind === 'author' ? 'assessment' : 'author';

      assert.equal(config.appId, app.applicationId);
      assert.equal(config.productName, app.productName);
      assert.equal(config.electronVersion, '43.4.0');
      assert.equal(config.asar, true);
      assert.equal(config.npmRebuild, false);
      assert.equal(config.forceCodeSigning, false);
      assert.equal(config.publish, null);
      assert.deepEqual(config.directories, {
        output: `../../dist/desktop/${app.kind}`,
      });
      assert.deepEqual(config.files, [
        'dist/src/* */*.js',
        `!dist/src/${siblingEntry}.js`,
        'dist/release/contract.js',
      ]);
      assert.deepEqual(config.extraResources, [
        {
          from: `../${app.rendererDirectory}/dist/${app.rendererFile}`,
          to: `renderer/${app.rendererFile}`,
        },
      ]);
      assert.deepEqual(config.extraMetadata, {
        name: app.packageName,
        productName: app.productName,
        desktopName: app.applicationId,
        version: VERSION,
        description: app.description,
        author: 'CSF Self Assessment',
        repository: 'https://github.com/SUSE/csf-self-assessment',
        main: `dist/src/${app.kind}.js`,
      });
      assert.equal(
        config.files.includes(`dist/src/${siblingEntry}.js`),
        false,
      );
      assert.equal(config.extraResources.length, 1);
    }
  }
});

test('package configuration owns exact native targets and icons', () => {
  for (const trust of UNSIGNED_TRUSTS) {
    for (const app of [AUTHOR_TARGET, ASSESSMENT_TARGET]) {
      const config = packageConfiguration(app, VERSION, trust, 'macos');
      const macArtifactName = `csf-${app.kind}-${'${version}'}-macos-${'${arch}'}.${'${ext}'}`;
      const windowsArtifactName = `csf-${app.kind}-${'${version}'}-windows-${'${arch}'}.${'${ext}'}`;
      const linuxArtifactName = `csf-${app.kind}-${'${version}'}-linux-x64.${'${ext}'}`;

      assert.deepEqual(config.mac, {
        target: [
          { target: 'dmg', arch: ['universal'] },
          { target: 'zip', arch: ['universal'] },
        ],
        identity: null,
        category: 'public.app-category.productivity',
        icon: `release/icons/generated/${app.kind}/icon.icns`,
        artifactName: macArtifactName,
      });
      assert.deepEqual(config.win, {
        target: [{ target: 'nsis', arch: ['x64'] }],
        icon: `release/icons/generated/${app.kind}/icon.ico`,
        artifactName: windowsArtifactName,
      });
      assert.deepEqual(config.linux, {
        target: [
          { target: 'AppImage', arch: ['x64'] },
          { target: 'deb', arch: ['x64'] },
          { target: 'rpm', arch: ['x64'] },
        ],
        executableName: app.packageName,
        syncDesktopName: true,
        category: 'Office',
        desktop: { entry: { Name: app.productName } },
        maintainer: 'CSF Self Assessment',
        vendor: 'CSF Self Assessment',
        description: app.description,
        synopsis: app.description,
        icon: `release/icons/generated/${app.kind}/icon-512.png`,
        artifactName: linuxArtifactName,
      });
      assert.deepEqual(config.rpm, {
        fpm: ['--rpm-rpmbuild-define=_build_id_links none'],
        depends: [
          'gtk3',
          'libnotify',
          'nss',
          'libXScrnSaver',
          '(libXtst or libXtst6)',
          'xdg-utils',
          'at-spi2-core',
          '(libuuid or libuuid1)',
          '(alsa-lib or libasound2)',
        ],
      });
      assert.equal('hardenedRuntime' in (config.mac ?? {}), false);
      assert.equal('notarize' in (config.mac ?? {}), false);
      assert.equal('signtoolOptions' in (config.win ?? {}), false);
    }
  }
});

test('Linux packages keep display names out of package metadata paths', () => {
  for (const app of [AUTHOR_TARGET, ASSESSMENT_TARGET]) {
    const config = packageConfiguration(
      app,
      VERSION,
      'unsigned-candidate',
      'linux',
    );

    assert.equal(config.productName, app.packageName);
    assert.equal(config.extraMetadata?.productName, undefined);
    assert.deepEqual(config.linux?.desktop, {
      entry: { Name: app.productName },
    });
  }
});

test('the release config remains compatible with a local ARM64 dir override', () => {
  const config = packageConfiguration(
    AUTHOR_TARGET,
    VERSION,
    'local-proof',
    'macos',
  );

  assert.deepEqual(config.mac?.target, [
    { target: 'dmg', arch: ['universal'] },
    { target: 'zip', arch: ['universal'] },
  ]);
  assert.equal(config.mac?.identity, null);
  assert.equal(config.forceCodeSigning, false);
  assert.equal('localMode' in config, false);
});

test('a signed candidate turns on both operating-system trust systems', () => {
  for (const app of [AUTHOR_TARGET, ASSESSMENT_TARGET]) {
    const config = packageConfiguration(
      app,
      VERSION,
      'signed-candidate',
      'macos',
    );
    const unsigned = packageConfiguration(
      app,
      VERSION,
      'unsigned-candidate',
      'macos',
    );

    assert.equal(config.forceCodeSigning, true);
    assert.equal('identity' in (config.mac ?? {}), false);
    assert.equal(config.mac?.hardenedRuntime, true);
    assert.equal(config.mac?.notarize, true);
    assert.equal(config.mac?.type, 'distribution');
    assert.deepEqual(config.win?.signtoolOptions, {
      signingHashAlgorithms: ['sha256'],
      rfc3161TimeStampServer: 'http://timestamp.digicert.com',
    });
    assert.equal('publisherName' in (config.win ?? {}), false);
    assert.deepEqual(config.linux, unsigned.linux);
  }
});
