import assert from 'node:assert/strict';
import {
  access,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { assertReleaseFailure } from './release-assert.js';
import {
  PACKAGE_TRUST_VARIABLE,
  SIGNING_SECRET_NAMES,
  requiredSigningSecrets,
} from '../release/contract.js';
import type {
  CandidateTrust,
  DesktopSystem,
  SigningSecretName,
} from '../release/contract.js';
import {
  APPLE_API_KEY_FILE,
  BUILDER_SIGNING_VARIABLE_NAMES,
  withSigningEnvironment,
} from '../release/native-signing.js';

function decoyEnvironment(): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {
    PATH: 'unchanged',
    CSC_LINK: 'ambient-builder',
    CSC_KEY_PASSWORD: 'ambient-builder',
    WIN_CSC_LINK: 'ambient-builder',
    APPLE_API_KEY: 'ambient-builder',
    APPLE_ID: 'ambient-builder',
    APPLE_TEAM_ID: 'ambient-builder',
  };
  for (const name of SIGNING_SECRET_NAMES) {
    environment[name] = 'ambient-secret';
  }
  return environment;
}

function completeMacEnvironment(): NodeJS.ProcessEnv {
  return {
    ...decoyEnvironment(),
    MACOS_CSC_LINK: 'mac-link',
    MACOS_CSC_KEY_PASSWORD: 'mac-password',
    APPLE_API_KEY_P8: '-----P8-BODY-----',
    APPLE_API_KEY_ID: 'KEYID1234',
    APPLE_API_ISSUER: 'issuer-uuid',
  };
}

function completeWindowsEnvironment(): NodeJS.ProcessEnv {
  return {
    ...decoyEnvironment(),
    WINDOWS_CSC_LINK: 'win-link',
    WINDOWS_CSC_KEY_PASSWORD: 'win-password',
  };
}

test('a signed Mac run maps only the Electron Builder names and removes the key file', async () => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'csf-native-signing-'));
  const environment = completeMacEnvironment();
  const original = { ...environment };
  const keyPath = join(temporaryRoot, APPLE_API_KEY_FILE);

  try {
    await withSigningEnvironment(
      {
        system: 'macos',
        trust: 'signed-candidate',
        environment,
        temporaryRoot,
      },
      async (child) => {
        assert.equal(child.CSC_LINK, 'mac-link');
        assert.equal(child.CSC_KEY_PASSWORD, 'mac-password');
        assert.equal(child.APPLE_API_KEY, keyPath);
        assert.equal(child.APPLE_API_KEY_ID, 'KEYID1234');
        assert.equal(child.APPLE_API_ISSUER, 'issuer-uuid');
        assert.equal(child[PACKAGE_TRUST_VARIABLE], 'signed-candidate');
        assert.equal(child.PATH, 'unchanged');
        for (const name of [
          'MACOS_CSC_LINK',
          'MACOS_CSC_KEY_PASSWORD',
          'APPLE_API_KEY_P8',
          'WINDOWS_CSC_LINK',
          'WINDOWS_CSC_KEY_PASSWORD',
        ]) {
          assert.equal(name in child, false);
        }
        for (const name of BUILDER_SIGNING_VARIABLE_NAMES) {
          if (
            ![
              'CSC_LINK',
              'CSC_KEY_PASSWORD',
              'APPLE_API_KEY',
              'APPLE_API_KEY_ID',
              'APPLE_API_ISSUER',
            ].includes(name)
          ) {
            assert.equal(name in child, false);
          }
        }
        assert.equal(await readFile(keyPath, 'utf8'), '-----P8-BODY-----');
        assert.equal((await stat(keyPath)).mode & 0o777, 0o600);
      },
    );

    await assert.rejects(access(keyPath), { code: 'ENOENT' });
    assert.deepEqual(environment, original);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('a signed Mac run removes the key file when the body throws', async () => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'csf-native-signing-'));
  const keyPath = join(temporaryRoot, APPLE_API_KEY_FILE);

  try {
    await assert.rejects(
      withSigningEnvironment(
        {
          system: 'macos',
          trust: 'signed-candidate',
          environment: completeMacEnvironment(),
          temporaryRoot,
        },
        async () => {
          throw new Error('boom');
        },
      ),
      { message: 'boom' },
    );
    await assert.rejects(access(keyPath), { code: 'ENOENT' });
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('a signed Windows run maps only the two Windows values', async () => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'csf-native-signing-'));

  try {
    await withSigningEnvironment(
      {
        system: 'windows',
        trust: 'signed-candidate',
        environment: completeWindowsEnvironment(),
        temporaryRoot,
      },
      async (child) => {
        assert.equal(child.CSC_LINK, 'win-link');
        assert.equal(child.CSC_KEY_PASSWORD, 'win-password');
        assert.equal(child[PACKAGE_TRUST_VARIABLE], 'signed-candidate');
        assert.equal('APPLE_API_KEY' in child, false);
        for (const name of SIGNING_SECRET_NAMES) {
          assert.equal(name in child, false);
        }
        assert.deepEqual(await readdir(temporaryRoot), []);
      },
    );
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('signed Linux and every unsigned run receive no signing material', async () => {
  const combinations: readonly [DesktopSystem, CandidateTrust][] = [
    ['linux', 'signed-candidate'],
    ['macos', 'unsigned-candidate'],
    ['windows', 'unsigned-candidate'],
    ['linux', 'unsigned-candidate'],
  ];

  for (const [system, trust] of combinations) {
    const temporaryRoot = await mkdtemp(join(tmpdir(), 'csf-native-signing-'));
    try {
      await withSigningEnvironment(
        {
          system,
          trust,
          environment: decoyEnvironment(),
          temporaryRoot,
        },
        async (child) => {
          for (const name of BUILDER_SIGNING_VARIABLE_NAMES) {
            assert.equal(name in child, false);
          }
          for (const name of SIGNING_SECRET_NAMES) {
            assert.equal(name in child, false);
          }
          assert.equal(child[PACKAGE_TRUST_VARIABLE], trust);
          assert.equal(child.PATH, 'unchanged');
          assert.deepEqual(await readdir(temporaryRoot), []);
        },
      );
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }
});

test('a missing or blank required secret fails before any file is written', async () => {
  const cases: readonly [
    DesktopSystem,
    () => NodeJS.ProcessEnv,
    readonly SigningSecretName[],
  ][] = [
    [
      'macos',
      completeMacEnvironment,
      requiredSigningSecrets('macos', 'signed-candidate'),
    ],
    [
      'windows',
      completeWindowsEnvironment,
      requiredSigningSecrets('windows', 'signed-candidate'),
    ],
  ];

  for (const [system, createEnvironment, names] of cases) {
    for (const name of names) {
      for (const blank of [false, true]) {
        const temporaryRoot = await mkdtemp(
          join(tmpdir(), 'csf-native-signing-'),
        );
        const environment = createEnvironment();
        if (blank) {
          environment[name] = '   ';
        } else {
          delete environment[name];
        }
        let called = false;

        try {
          await assertReleaseFailure(
            async () => {
              await withSigningEnvironment(
                {
                  system,
                  trust: 'signed-candidate',
                  environment,
                  temporaryRoot,
                },
                async () => {
                  called = true;
                },
              );
            },
            { kind: 'missing-signing-secret', system, secret: name },
          );
          assert.equal(called, false);
          assert.deepEqual(await readdir(temporaryRoot), []);
        } finally {
          await rm(temporaryRoot, { recursive: true, force: true });
        }
      }
    }

    const temporaryRoot = await mkdtemp(join(tmpdir(), 'csf-native-signing-'));
    const environment = createEnvironment();
    for (const name of names) {
      delete environment[name];
    }
    try {
      await assertReleaseFailure(
        async () => {
          await withSigningEnvironment(
            {
              system,
              trust: 'signed-candidate',
              environment,
              temporaryRoot,
            },
            async () => undefined,
          );
        },
        {
          kind: 'missing-signing-secret',
          system,
          secret: names[0],
        },
      );
      assert.deepEqual(await readdir(temporaryRoot), []);
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }
});
