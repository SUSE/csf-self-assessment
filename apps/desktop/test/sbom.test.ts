import assert from 'node:assert/strict';
import { test } from 'node:test';

import { z } from 'zod';

import { ReleaseVersionSchema } from '../release/contract.js';
import {
  createDesktopSbom,
  validateDesktopSbom,
} from '../release/sbom.js';
import type { PackagedDependency } from '../release/sbom.js';

const VERSION = ReleaseVersionSchema.parse('0.1.0-rc.1');
const DEPENDENCIES: readonly PackagedDependency[] = [
  { type: 'framework', name: 'electron', version: '43.4.0', license: 'MIT' },
  { type: 'library', name: 'zod', version: '3.24.1', license: 'MIT' },
];

const ComponentSchema = z
  .object({
    type: z.enum(['application', 'framework', 'library']),
    'bom-ref': z.string().min(1),
    name: z.string().min(1),
    version: z.string().min(1),
  })
  .passthrough();
const SbomSchema = z
  .object({
    bomFormat: z.literal('CycloneDX'),
    specVersion: z.literal('1.6'),
    serialNumber: z.string().optional(),
    metadata: z
      .object({
        timestamp: z.string().optional(),
        component: ComponentSchema,
      })
      .passthrough(),
    components: z.array(ComponentSchema),
    dependencies: z.array(
      z
        .object({
          ref: z.string().min(1),
          dependsOn: z.array(z.string()).default([]),
        })
        .strict(),
    ),
  })
  .passthrough();

test('desktop SBOM is deterministic CycloneDX 1.6 with exact shipped edges', async () => {
  const first = await createDesktopSbom(VERSION, DEPENDENCIES);
  const second = await createDesktopSbom(VERSION, DEPENDENCIES);
  assert.equal(first, second);
  await validateDesktopSbom(first);

  const sbom = SbomSchema.parse(JSON.parse(first));
  assert.equal(sbom.serialNumber, undefined);
  assert.equal(sbom.metadata.timestamp, undefined);
  assert.deepEqual(sbom.metadata.component, {
    type: 'application',
    'bom-ref': 'pkg:generic/csf-self-assessment-desktop@0.1.0-rc.1',
    name: 'csf-self-assessment-desktop',
    version: '0.1.0-rc.1',
  });

  assert.equal(sbom.components.length, 4);
  const author = sbom.components.find(({ name }) => name === 'csf-author');
  const assessment = sbom.components.find(
    ({ name }) => name === 'csf-assessment',
  );
  const electron = sbom.components.filter(({ name }) => name === 'electron');
  const zod = sbom.components.filter(({ name }) => name === 'zod');
  assert.ok(author !== undefined);
  assert.ok(assessment !== undefined);
  assert.equal(electron.length, 1);
  assert.equal(electron[0]?.type, 'framework');
  assert.equal(electron[0]?.version, '43.4.0');
  assert.equal(zod.length, 1);
  assert.equal(zod[0]?.type, 'library');
  assert.equal(zod[0]?.version, '3.24.1');
  assert.equal(sbom.components.some(({ name }) => name === 'electron-builder'), false);

  const byRef = new Map(sbom.dependencies.map((edge) => [edge.ref, edge.dependsOn]));
  assert.deepEqual(byRef.get(sbom.metadata.component['bom-ref']), [
    author['bom-ref'],
    assessment['bom-ref'],
  ]);
  assert.deepEqual(byRef.get(author['bom-ref']), [
    electron[0]?.['bom-ref'],
    zod[0]?.['bom-ref'],
  ]);
  assert.deepEqual(byRef.get(assessment['bom-ref']), [
    electron[0]?.['bom-ref'],
    zod[0]?.['bom-ref'],
  ]);
});
