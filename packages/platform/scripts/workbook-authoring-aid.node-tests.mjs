import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';

import '../../../tools/ts-loader.mjs';
import { generateWorkbookSchema, serializeSchema } from '../../../tools/export-schema.mjs';
import { validateWorkbook as validatePlatform } from '../../../tools/validate-workbook.mjs';

const ROOT = resolve(import.meta.dirname, '../../..');
const SCHEMA_FILE = join(ROOT, 'tools/csf-workbook.schema.json');
const SAMPLES_DIR = join(ROOT, 'samples');
const SKILL_FILE = join(ROOT, 'tools/skill/SKILL.md');
const PLATFORM_VALIDATOR_PATH = join(ROOT, 'tools/validate-workbook.mjs');
const STANDALONE_VALIDATOR_PATH = join(ROOT, 'tools/skill/scripts/validate-workbook.mjs');

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

test('schema parity: tools/csf-workbook.schema.json matches platform WorkbookSchema', async () => {
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

// Verification 1: Differential Testing on All Fixtures (Input/Output Parity)
test('1. Differential Testing: both validators produce identical results on all sample workbooks', async () => {
  const sampleFiles = findWorkbooks(SAMPLES_DIR);
  assert.ok(sampleFiles.length > 0, 'Found sample workbooks');

  const { validateWorkbook: validateStandalone } = await import(pathToFileURL(STANDALONE_VALIDATOR_PATH).href);

  for (const sampleFile of sampleFiles) {
    const raw = readFileSync(sampleFile, 'utf8');
    const parsed = JSON.parse(raw);

    const [resPlatform, resStandalone] = await Promise.all([
      validatePlatform(raw),
      validateStandalone(parsed),
    ]);

    assert.equal(resPlatform.ok, true, `Platform validator failed on ${sampleFile}: ${JSON.stringify(resPlatform.issues)}`);
    assert.equal(resStandalone.ok, true, `Standalone validator failed on ${sampleFile}: ${JSON.stringify(resStandalone.issues)}`);
    assert.equal(resPlatform.issues.length, 0);
    assert.equal(resStandalone.issues.length, 0);

    // Verify inventory summary counts match field-for-field
    assert.deepEqual(resStandalone.summary, resPlatform.summary, `Summary mismatch on ${sampleFile}`);
  }
});

// Verification 2: Platform Rule Matrix Coverage (Zero Missing Rules)
test('2. Rule Matrix Coverage: standalone validator implements every active platform rule ID', async () => {
  const { WORKBOOK_RULES } = await import('../../../packages/platform/src/schema/workbook-rules.ts');
  const activeRuleIds = WORKBOOK_RULES.map((r) => r.id);
  assert.equal(activeRuleIds.length, 22, 'Expected 22 active platform rules (R1-R23, R12 retired)');

  const standaloneSource = readFileSync(STANDALONE_VALIDATOR_PATH, 'utf8');

  for (const rule of WORKBOOK_RULES) {
    const pattern = new RegExp(`['"\`]${rule.id}[: '"\`]`);
    assert.ok(
      pattern.test(standaloneSource),
      `standalone validator (${STANDALONE_VALIDATOR_PATH}) is missing implementation for platform rule ${rule.id} (${rule.name})`,
    );
  }
});

// Verification 3: Adversarial Rule Mutation Parity (Semantic Parity on Failures)
test('3. Adversarial Rule Mutation Parity: both validators catch all active rules with identical rule IDs', async () => {
  const { WORKBOOK_RULES } = await import('../../../packages/platform/src/schema/workbook-rules.ts');
  const { validateWorkbook: validateStandalone } = await import(pathToFileURL(STANDALONE_VALIDATOR_PATH).href);

  const base1 = JSON.parse(readFileSync(join(SAMPLES_DIR, 'learn-basics/workbook.json'), 'utf8'));
  const baseRec = JSON.parse(readFileSync(join(SAMPLES_DIR, 'recommendations/workbook.json'), 'utf8'));

  const mutations = {
    R1: (wb) => { wb.objectives[0].weight = 50; },
    R2: (wb) => {
      const o = structuredClone(wb.objectives[0]);
      wb.objectives[0].weight = 50;
      o.weight = 50;
      o.questions.forEach((q, i) => { q.id = `extra-${i}`; });
      wb.objectives.push(o);
    },
    R3: (wb) => { wb.objectives[0].questions[1].id = wb.objectives[0].questions[0].id; },
    R4: (wb) => { wb.sealLevels[1].seal = wb.sealLevels[0].seal; },
    R5: (wb) => { wb.objectives[0].questions[0].ladder[1].id = wb.objectives[0].questions[0].ladder[0].id; },
    R6: (wb) => {
      const q = wb.objectives[0].questions.find((x) => x.scope === 'dimension');
      q.appliesTo.push('non-existent-dimension-id');
    },
    R7: (wb) => { wb.dimensions.push({ id: wb.dimensions[0].id, name: 'Duplicate' }); },
    R8: (wb) => { wb.dimensions[0].strata = ['only-one-stratum']; },
    R9: (wb) => { wb.testEstates.push(structuredClone(wb.testEstates[0])); },
    R10: (wb) => { wb.testEstates[0].answers.push({ questionId: 'unknown-question-id', rungId: 'r0' }); },
    R11: (wb) => { wb.testEstates[0].answers[0].rungId = 'unknown-rung-id'; },
    R13: (wb) => { wb.roles.push({ id: wb.roles[0].id, name: 'Duplicate' }); },
    R14: (wb) => { wb.objectives[0].questions[0].role = 'UNKNOWN-ROLE'; },
    R15: (wb) => { wb.parties.push({ id: wb.parties[0].id, name: 'Duplicate', kind: 'third-party' }); },
    R16: (wb) => { wb.parties[0].kind = 'third-party'; },
    R17: (wb) => { wb.testEstates[0].parties[0].type = 'unknown-party-type'; },
    R18: (wb) => { wb.recommendations.push(structuredClone(wb.recommendations[0])); },
    R19: (wb) => { wb.recommendations[0].links.push({ kind: 'question', id: 'unknown-question-link' }); },
    R20: (wb) => {
      wb.recommendations[0].whenAtOrBelow = 4;
      wb.sealLevels = wb.sealLevels.filter((s) => s.seal !== 4);
    },
    R21: (wb) => { delete wb.recommender; },
    R22: (wb) => {
      wb.objectives[0].questions[0].ladder[0].points = 90;
      wb.objectives[0].questions[0].ladder[1].points = 10;
    },
    R23: (wb) => {
      wb.objectives[0].questions[0].ladder[0].seal = 3;
      wb.objectives[0].questions[0].ladder[1].seal = 1;
    },
  };

  for (const rule of WORKBOOK_RULES) {
    const mutator = mutations[rule.id];
    assert.ok(mutator, `Missing mutation definition for active rule ${rule.id}`);

    const isRecRule = ['R18', 'R19', 'R20', 'R21'].includes(rule.id);
    const mutated = structuredClone(isRecRule ? baseRec : base1);
    mutator(mutated);

    const [resPlatform, resStandalone] = await Promise.all([
      validatePlatform(mutated),
      validateStandalone(mutated),
    ]);

    assert.equal(resPlatform.ok, false, `Platform validator should reject mutation for ${rule.id}`);
    assert.equal(resStandalone.ok, false, `Standalone validator should reject mutation for ${rule.id}`);

    const platformHasRule = resPlatform.issues.some((i) => i.ruleId === rule.id);
    const standaloneHasRule = resStandalone.issues.some(
      (i) => (i.ruleId || '').startsWith(`${rule.id}:`) || i.ruleId === rule.id,
    );

    assert.ok(
      platformHasRule,
      `Platform validator did not report ${rule.id}. Reported: ${resPlatform.issues.map((i) => i.ruleId).join(', ')}`,
    );
    assert.ok(
      standaloneHasRule,
      `Standalone validator did not report ${rule.id}. Reported: ${resStandalone.issues.map((i) => i.ruleId).join(', ')}`,
    );
  }
});

test('tools/skill/assets/starter-workbook.json is valid according to both validators', async () => {
  const assetPath = join(ROOT, 'tools/skill/assets/starter-workbook.json');
  assert.ok(existsSync(assetPath), 'starter-workbook.json must exist in assets');
  const raw = readFileSync(assetPath, 'utf8');
  const parsed = JSON.parse(raw);

  const { validateWorkbook: validateStandalone } = await import(pathToFileURL(STANDALONE_VALIDATOR_PATH).href);

  const [resPlatform, resStandalone] = await Promise.all([
    validatePlatform(raw),
    validateStandalone(parsed),
  ]);

  assert.ok(resPlatform.ok, `Starter asset failed platform validation: ${JSON.stringify(resPlatform.issues)}`);
  assert.ok(resStandalone.ok, `Starter asset failed standalone validation: ${JSON.stringify(resStandalone.issues)}`);
  assert.deepEqual(resStandalone.summary, resPlatform.summary);
  assert.equal(resPlatform.summary.objectives, 2);
  assert.equal(resPlatform.summary.questions, 2);
});

test('starter skeleton in tools/skill/SKILL.md is valid according to both validators', async () => {
  const content = readFileSync(SKILL_FILE, 'utf8');
  const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
  assert.ok(jsonMatch, 'SKILL.md must contain starter skeleton json');
  const parsed = JSON.parse(jsonMatch[1]);

  const { validateWorkbook: validateStandalone } = await import(pathToFileURL(STANDALONE_VALIDATOR_PATH).href);

  const [resPlatform, resStandalone] = await Promise.all([
    validatePlatform(jsonMatch[1]),
    validateStandalone(parsed),
  ]);

  assert.ok(resPlatform.ok, `Starter skeleton failed platform validation: ${JSON.stringify(resPlatform.issues)}`);
  assert.ok(resStandalone.ok, `Starter skeleton failed standalone validation: ${JSON.stringify(resStandalone.issues)}`);
  assert.deepEqual(resStandalone.summary, resPlatform.summary);
  assert.equal(resPlatform.summary.objectives, 1);
  assert.equal(resPlatform.summary.questions, 1);
});

test('tools/skill metadata, scripts reference, and evals are configured', () => {
  const skillContent = readFileSync(SKILL_FILE, 'utf8');
  assert.ok(skillContent.includes('node -v'), 'SKILL.md must instruct node -v check');
  assert.ok(skillContent.includes('scripts/validate-workbook.mjs'), 'SKILL.md must reference scripts/validate-workbook.mjs');
  assert.ok(skillContent.includes('assets/starter-workbook.json'), 'SKILL.md must reference assets/starter-workbook.json');

  const evalsPath = join(ROOT, 'tools/skill/evals/evals.json');
  assert.ok(existsSync(evalsPath), 'evals/evals.json must exist');
  const evalsData = JSON.parse(readFileSync(evalsPath, 'utf8'));
  assert.equal(evalsData.skill_name, 'csf-authoring');
  assert.ok(Array.isArray(evalsData.evals) && evalsData.evals.length >= 3);
});

// Verification 4: Structural Schema & Type Deformity Parity
test('4. Structural Deformity Parity: both validators reject malformed shapes and report identical paths', async () => {
  const { validateWorkbook: validateStandalone } = await import(pathToFileURL(STANDALONE_VALIDATOR_PATH).href);
  const base = JSON.parse(readFileSync(join(SAMPLES_DIR, 'learn-basics/workbook.json'), 'utf8'));

  const deformities = [
    { name: 'Non-object root', make: () => 'not-an-object', path: '' },
    { name: 'Invalid schemaVersion', make: (w) => { w.schemaVersion = '1.0'; }, path: 'schemaVersion' },
    { name: 'Missing meta', make: (w) => { delete w.meta; }, path: 'meta' },
    { name: 'Missing meta.title', make: (w) => { delete w.meta.title; }, path: 'meta.title' },
    { name: 'Missing meta.id', make: (w) => { delete w.meta.id; }, path: 'meta.id' },
    { name: 'Missing meta.version', make: (w) => { delete w.meta.version; }, path: 'meta.version' },
    { name: 'Invalid weight type', make: (w) => { w.objectives[0].weight = 'invalid'; }, path: 'objectives.0.weight' },
    { name: 'Negative ladder points', make: (w) => { w.objectives[0].questions[0].ladder[0].points = -5; }, path: 'objectives.0.questions.0.ladder.0.points' },
    { name: 'Empty questions array', make: (w) => { w.objectives[0].questions = []; }, path: 'objectives.0.questions' },
    { name: 'Missing question text', make: (w) => { delete w.objectives[0].questions[0].text; }, path: 'objectives.0.questions.0.text' },
    { name: 'Empty question why', make: (w) => { w.objectives[0].questions[0].why = ''; }, path: 'objectives.0.questions.0.why' },
    { name: 'Invalid question scope', make: (w) => { w.objectives[0].questions[0].scope = 'unknown-scope'; }, path: 'objectives.0.questions.0.scope' },
    { name: 'Empty sealLevels', make: (w) => { w.sealLevels = []; }, path: 'sealLevels' },
  ];

  for (const item of deformities) {
    const wb = structuredClone(base);
    const target = item.make(wb) ?? wb;

    const [resPlatform, resStandalone] = await Promise.all([
      validatePlatform(target),
      validateStandalone(target),
    ]);

    assert.equal(resPlatform.ok, false, `Platform validator should reject ${item.name}`);
    assert.equal(resStandalone.ok, false, `Standalone validator should reject ${item.name}`);

    const pHasPath = resPlatform.issues.some((i) => i.path === item.path || i.path.startsWith(item.path));
    const sHasPath = resStandalone.issues.some((i) => i.path === item.path || i.path.startsWith(item.path));

    assert.ok(pHasPath, `Platform validator missed expected path "${item.path}" for ${item.name}`);
    assert.ok(sHasPath, `Standalone validator missed expected path "${item.path}" for ${item.name}`);
  }
});

// Verification 5: CLI Process & Exit Code Parity
test('5. CLI Process Parity: both CLI tools match in exit codes, JSON reporting, and stdin support', () => {
  const pCLI = PLATFORM_VALIDATOR_PATH;
  const sCLI = STANDALONE_VALIDATOR_PATH;
  const samplePath = join(SAMPLES_DIR, 'learn-basics/workbook.json');
  const sampleContent = readFileSync(samplePath);

  // 1. Valid file -> both exit with 0
  const p1 = spawnSync(process.execPath, [pCLI, samplePath]);
  const s1 = spawnSync(process.execPath, [sCLI, samplePath]);
  assert.equal(p1.status, 0, 'Platform CLI should exit 0 on valid file');
  assert.equal(s1.status, 0, 'Standalone CLI should exit 0 on valid file');

  // 2. Missing file -> both exit with 1
  const p2 = spawnSync(process.execPath, [pCLI, 'non-existent-workbook.json']);
  const s2 = spawnSync(process.execPath, [sCLI, 'non-existent-workbook.json']);
  assert.equal(p2.status, 1, 'Platform CLI should exit 1 on missing file');
  assert.equal(s2.status, 1, 'Standalone CLI should exit 1 on missing file');

  // 3. Output as JSON (--json) -> both produce parseable JSON array with matching summaries
  const p3 = spawnSync(process.execPath, [pCLI, '--json', samplePath]);
  const s3 = spawnSync(process.execPath, [sCLI, '--json', samplePath]);
  assert.equal(p3.status, 0);
  assert.equal(s3.status, 0);
  const pJson = JSON.parse(p3.stdout.toString());
  const sJson = JSON.parse(s3.stdout.toString());
  assert.equal(pJson[0].ok, true);
  assert.equal(sJson[0].ok, true);
  assert.deepEqual(sJson[0].summary, pJson[0].summary, 'JSON summary mismatch between CLIs');

  // 4. Stdin support via '-' -> both accept piped input and exit with 0
  const p4 = spawnSync(process.execPath, [pCLI, '-'], { input: sampleContent });
  const s4 = spawnSync(process.execPath, [sCLI, '-'], { input: sampleContent });
  assert.equal(p4.status, 0, 'Platform CLI should exit 0 when reading stdin');
  assert.equal(s4.status, 0, 'Standalone CLI should exit 0 when reading stdin');
});
