import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

import '../../../tools/ts-loader.mjs';
import { generateWorkbookSchema, serializeSchema } from '../../../tools/export-schema.mjs';
import { validateWorkbook } from '../../../tools/validate-workbook.mjs';

const ROOT = resolve(import.meta.dirname, '../../..');
const SCHEMA_FILE = join(ROOT, 'tools/csf-workbook.schema.json');
const SAMPLES_DIR = join(ROOT, 'samples');
const SKILL_FILE = join(ROOT, 'tools/skill/SKILL.md');

test('tools/csf-workbook.schema.json matches generated schema exactly (schema parity)', async () => {
  assert.ok(existsSync(SCHEMA_FILE), 'tools/csf-workbook.schema.json must exist');
  const onDisk = readFileSync(SCHEMA_FILE, 'utf8');
  const generated = await generateWorkbookSchema();
  const serialized = serializeSchema(generated);

  assert.equal(onDisk, serialized, 'tools/csf-workbook.schema.json on disk must match generated output');
  assert.equal(generated.$schema, 'http://json-schema.org/draft-07/schema#');
  assert.equal(generated.title, 'CSFWorkbook');
  assert.ok(generated.properties.schemaVersion);
  assert.ok(generated.properties.objectives);
  assert.ok(generated.properties.dimensions);
  assert.ok(generated.properties.roles);
  assert.ok(generated.properties.parties);
  assert.ok(generated.properties.sealLevels);
});

test('all sample workbooks validate cleanly against WorkbookSchema and R1-R23', async () => {
  function findWorkbooks(dir, out = []) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        findWorkbooks(full, out);
      } else if (entry === 'workbook.json') {
        out.push(full);
      }
    }
    return out;
  }

  const sampleFiles = findWorkbooks(SAMPLES_DIR);
  assert.ok(sampleFiles.length > 0, 'Found sample workbooks');

  for (const sampleFile of sampleFiles) {
    const raw = readFileSync(sampleFile, 'utf8');
    const res = await validateWorkbook(raw);
    assert.ok(res.ok, `Sample ${sampleFile} failed validation: ${JSON.stringify(res.issues)}`);
    assert.equal(res.issues.length, 0);
    assert.ok(res.summary);
    assert.ok(res.summary.objectives > 0);
    assert.ok(res.summary.questions > 0);
  }
});

test('tools/validate-workbook.mjs accurately diagnoses R1-R23 rule violations', async () => {
  const baseRaw = readFileSync(join(SAMPLES_DIR, 'learn-basics/workbook.json'), 'utf8');
  const base = JSON.parse(baseRaw);

  // R1: weightsTotal100
  {
    const broken = structuredClone(base);
    broken.objectives[0].weight = 75; // was 100
    const res = await validateWorkbook(broken);
    assert.equal(res.ok, false);
    const r1 = res.issues.find((i) => i.ruleId === 'R1');
    assert.ok(r1, 'Should find R1 issue');
    assert.equal(r1.ruleName, 'weightsTotal100');
    assert.equal(r1.path, 'objectives');
    assert.match(r1.message, /weights must sum to 100/i);
  }

  // R6: appliesToNamesDeclaredDimension
  {
    const broken = structuredClone(base);
    const dimQ = broken.objectives[0].questions.find((q) => q.scope === 'dimension');
    assert.ok(dimQ, 'Has dimension question');
    dimQ.appliesTo.push('non-existent-dim');
    const res = await validateWorkbook(broken);
    assert.equal(res.ok, false);
    const r6 = res.issues.find((i) => i.ruleId === 'R6');
    assert.ok(r6, 'Should find R6 issue');
    assert.equal(r6.ruleName, 'appliesToNamesDeclaredDimension');
    assert.match(r6.message, /unknown dimension "non-existent-dim"/);
  }

  // R7: dimensionIdsUnique
  {
    const broken = structuredClone(base);
    broken.dimensions.push({ id: broken.dimensions[0].id, name: 'Duplicate' });
    const res = await validateWorkbook(broken);
    assert.equal(res.ok, false);
    const r7 = res.issues.find((i) => i.ruleId === 'R7');
    assert.ok(r7, 'Should find R7 issue');
    assert.equal(r7.ruleName, 'dimensionIdsUnique');
  }

  // R14: questionRoleIsDeclared
  {
    const broken = structuredClone(base);
    broken.objectives[0].questions[0].role = 'UNKNOWN-ROLE';
    const res = await validateWorkbook(broken);
    assert.equal(res.ok, false);
    const r14 = res.issues.find((i) => i.ruleId === 'R14');
    assert.ok(r14, 'Should find R14 issue');
    assert.equal(r14.ruleName, 'questionRoleIsDeclared');
    assert.match(r14.message, /names unknown role "UNKNOWN-ROLE"/);
  }

  // R16: exactlyOneAssessedPartyType
  {
    const broken = structuredClone(base);
    broken.parties[0].kind = 'third-party'; // now 0 assessed parties
    const res = await validateWorkbook(broken);
    assert.equal(res.ok, false);
    const r16 = res.issues.find((i) => i.ruleId === 'R16');
    assert.ok(r16, 'Should find R16 issue');
    assert.equal(r16.ruleName, 'exactlyOneAssessedPartyType');
  }

  // R22: pointsNeverFall
  {
    const broken = structuredClone(base);
    const ladder = broken.objectives[0].questions[0].ladder;
    ladder[0].points = 50;
    ladder[1].points = 10;
    const res = await validateWorkbook(broken);
    assert.equal(res.ok, false);
    const r22 = res.issues.find((i) => i.ruleId === 'R22');
    assert.ok(r22, 'Should find R22 issue');
    assert.equal(r22.ruleName, 'pointsNeverFall');
    assert.match(r22.message, /drops in points/);
  }

  // R23: sealNeverFalls
  {
    const broken = structuredClone(base);
    const ladder = broken.objectives[0].questions[0].ladder;
    ladder[0].seal = 3;
    ladder[1].seal = 1;
    const res = await validateWorkbook(broken);
    assert.equal(res.ok, false);
    const r23 = res.issues.find((i) => i.ruleId === 'R23');
    assert.ok(r23, 'Should find R23 issue');
    assert.equal(r23.ruleName, 'sealNeverFalls');
    assert.match(r23.message, /drops in SEAL/);
  }
});

test('starter workbook in tools/skill/SKILL.md is valid according to validateWorkbook', async () => {
  const content = readFileSync(SKILL_FILE, 'utf8');
  const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
  assert.ok(jsonMatch, 'SKILL.md must contain starter json');
  const res = await validateWorkbook(jsonMatch[1]);
  assert.ok(res.ok, `Starter workbook in SKILL.md failed validation: ${JSON.stringify(res.issues)}`);
  assert.equal(res.issues.length, 0);
  assert.equal(res.summary.objectives, 2);
  assert.equal(res.summary.questions, 2);
  assert.equal(res.summary.dimensions, 2);
});
