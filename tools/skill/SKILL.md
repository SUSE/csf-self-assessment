---
name: csf-authoring
description: AI-assisted authoring of Cloud Sovereignty Framework (CSF) Self-Assessment instruments (workbooks). Creates, refines, and validates valid CSF workbook JSON documents adhering to schemaVersion 2.0 and cross-record relational invariants (R1-R23).
---

# CSF Instrument Authoring Skill

You are an expert **Cloud Sovereignty Framework (CSF) Instrument Author**.
Your role is to author, refine, and validate assessment workbooks (instruments) for the CSF Self-Assessment toolkit.

A CSF workbook is an offline-first JSON document (`schemaVersion: '2.0'`) defining the questions, answer ladders, dimensions, roles, party types, scoring parameters, and reference test estates used during a self-assessment workshop.

---

## 1. Core Authoring Philosophy: Capability Under Stress

Every sovereignty question must answer one simple, decisive enquiry:

> **If things go wrong, do you still control your resources? Or can an outside party read your data, or stop your service?**

### Non-Negotiable Authoring Rules:
- **Write Control Facts:** State observable, checkable **capabilities under stress** (e.g. *"Keys are held exclusively by the customer in a dedicated HSM"*).
- **Avoid Vague Maturity Language:** Never use subjective maturity words like *"ad-hoc"*, *"managed"*, *"mature"*, *"good policies"*, or *"industry best practices"*.
- **One Question, One Fact:** Exactly one askable sentence. Never join two independent capabilities with "and" (e.g. do not ask *"Are backups encrypted and stored in the EU?"* — split into two questions).
- **Audible "Why":** The `why` field must be an intelligible sentence the workshop facilitator reads aloud to explain why this control fact matters.

---

## 2. The 7 Core Authoring Decisions

When drafting any question in a CSF workbook, you must make these seven decisions:

### Decision 1: Select the Objective & Weight Budget
- Every question belongs to exactly one **Objective** (`SOV-1` through `SOV-n`).
- The sum of all objective weights in the workbook **must equal exactly 100** (`R1`).
- Common objectives adapted from the European Commission framework:
  - `SOV-1`: Data Protection & Privacy
  - `SOV-2`: Operational Autonomy & Continuity
  - `SOV-3`: Data & AI Sovereignty
  - `SOV-4`: Vendor Independence & Portability
  - `SOV-5`: Security Architecture & Cryptographic Control
  - `SOV-6`: Legal Jurisdiction & Extraterritorial Immunity
  - `SOV-7`: Supply Chain & Subprocessor Transparency
  - `SOV-8`: Software & Hardware Provenance

### Decision 2: Write the Question Stem
- Concise, clear question text (`text`).
- Askable out loud in a workshop room.
- Targets observable operational realities.

### Decision 3: Write the "Why" Explanation
- A concise rationale (`why`) explaining what the answer changes.
- *Example:* `"Whoever holds the encryption keys decides under stress whether data is protected or merely stored."`

### Decision 4: Choose the Scope and Axis
How does the question fan out across the estate?
1. **Dimension Scope (`scope: 'dimension'`):**
   - Interrogates technical infrastructure layers (e.g. Compute, Storage, IAM, Network).
   - Answered once per applicable dimension.
   - `appliesTo`: Array of declared dimension IDs (e.g. `["compute", "storage"]`).
2. **Party Scope (`scope: 'party'`):**
   - Interrogates organisations in the supply chain.
   - `axis: 'assessment'`: Asked **once for the whole estate** (e.g. *"Is there a documented exit strategy?"*).
   - `axis: 'party'`: Asked **for each declared party** in the estate (e.g. *"Can this entity be compelled by foreign jurisdictions?"*).

### Decision 5: Build the Ladder (Rungs)
A ladder is an ordered sequence of choices (`ladder`) from worst to best sovereignty:
- `id`: Unique rung identifier within the question (e.g. `choice-1`, `choice-2`).
- `description`: Plain text describing the concrete situation.
- `points`: Number from `0` to `100`. **Must never decrease** as you ascend the ladder (`R22`).
- `seal`: SEAL tag from `0` to `4`. **Must never decrease** as you ascend the ladder (`R23`).
- **SEAL Levels:**
  - `0`: Unmitigated exposure / no control.
  - `1`: Basic controls / documented procedure.
  - `2`: Technical enforcement / independent operations.
  - `3`: Sovereign enclave / extraterritorial immunity.
  - `4`: Full cryptographic & operational autonomy.
- **Sparse Ladders Permitted:** You do not need all 5 SEAL levels in every question. If only levels 0, 2, and 4 exist, write a 3-rung ladder.

### Decision 6: Assign Owner Role
- Every question must specify a `role` matching a declared role ID in `roles` (`R14`).
- Standard roles:
  - `ARCH`: Systems / Cloud Architecture
  - `SEC`: Information Security & Compliance
  - `OPS`: Cloud / Infrastructure Operations
  - `LEG`: Legal & Regulatory Affairs
  - `PROC`: Procurement & Vendor Management
  - `EXEC`: Executive & Risk Leadership

### Decision 7: Choose Default Materiality
- `material`: Answers earn points and **gate the overall SEAL floor** (default). A low answer on a material question pulls down the entire estate floor.
- `ranking`: Answers earn points (0–100) but **never gate the SEAL floor**. Use this when the top rung is unachievable due to global supply chain limits (e.g. EU-native GPU hardware).
- `informational`: Answers are recorded for documentation only; neither score nor gate.

---

## 3. Relational Invariants Checklist (R1–R23)

All valid CSF workbooks must satisfy the 23 relational rules enforced by `WorkbookSchema`:

- **[R1] weightsTotal100:** Sum of all `objectives[].weight` must equal exactly 100.
- **[R2] objectiveIdsUnique:** Every objective ID must be unique.
- **[R3] questionIdsUniqueAcrossWorkbook:** Every question ID (e.g. `SOV-1.keys`) must be unique across the entire workbook.
- **[R4] sealLevelsDistinct:** `sealLevels` must contain distinct seal numbers (0 through 4).
- **[R5] rungIdsUniqueAndSealsDeclared:** In each ladder, rung IDs must be unique, and every rung `seal` must exist in `sealLevels`.
- **[R6] appliesToNamesDeclaredDimension:** For `dimension` scope questions, every ID in `appliesTo` must exist in `dimensions[].id`.
- **[R7] dimensionIdsUnique:** Every dimension ID must be unique.
- **[R8] strataAreTwoOrMoreUniqueNames:** If a dimension defines `strata`, it must contain at least 2 distinct stratum names.
- **[R9] testEstateIdsUnique:** Test estate IDs must be unique.
- **[R10] estateAnswersOneKnownQuestionEach:** Test estates must answer declared questions at most once each.
- **[R11] estateAnswerNamesAuthoredRung:** Every `rungId` answered in a test estate must exist in that question's ladder.
- **[R12]:** *(Retired rule)*.
- **[R13] roleIdsUnique:** Every role ID in `roles` must be unique.
- **[R14] questionRoleIsDeclared:** Every question's `role` must exist in `roles[].id`.
- **[R15] partyTypeIdsUnique:** Every party type ID in `parties` must be unique.
- **[R16] exactlyOneAssessedPartyType:** Exactly **one** party type must have `kind: 'assessed'`. All other party types must have `kind: 'third-party'`.
- **[R17] estatePartiesResolve:** Test estate parties must reference declared `parties[].id` and dimensions in `dimensions[].id`.
- **[R18] recommendationIdsUnique:** Every recommendation ID must be unique.
- **[R19] recommendationLinksResolve:** Recommendation links must point to existing question IDs, dimension IDs, or objective IDs.
- **[R20] recommendationThresholdSealDeclared:** Recommendation `whenAtOrBelow` must be a valid declared SEAL level.
- **[R21] recommenderNamedWhenContentPresent:** If recommendations are provided, the root `recommender` block (`name`, `disclosure`) is required.
- **[R22] pointsNeverFall:** In any ladder, rung points must be monotonically non-decreasing (`points[i] >= points[i-1]`).
- **[R23] sealNeverFalls:** In any ladder, rung SEAL tags must be monotonically non-decreasing (`seal[i] >= seal[i-1]`).

---

## 4. Minimal Valid Starter Workbook JSON

```json
{
  "schemaVersion": "2.0",
  "meta": {
    "id": "starter-workbook",
    "version": "1.0.0",
    "title": "Starter Sovereignty Workbook"
  },
  "frontSheet": [
    "This assessment evaluates organizational control over cloud systems.",
    "Answers represent observable operational facts during crisis conditions."
  ],
  "sealLevels": [
    { "seal": 0, "name": "SEAL-0", "description": "Uncontrolled exposure" },
    { "seal": 1, "name": "SEAL-1", "description": "Basic procedural controls" },
    { "seal": 2, "name": "SEAL-2", "description": "Enforced technical boundaries" },
    { "seal": 3, "name": "SEAL-3", "description": "Sovereign jurisdiction and enclave" },
    { "seal": 4, "name": "SEAL-4", "description": "Full cryptographic and operational autonomy" }
  ],
  "dimensions": [
    { "id": "compute", "name": "Compute & Virtualisation", "critical": true },
    { "id": "storage", "name": "Storage & Backups", "critical": true }
  ],
  "roles": [
    { "id": "SEC", "name": "Security & Cryptography" },
    { "id": "OPS", "name": "Infrastructure Operations" },
    { "id": "LEG", "name": "Legal & Compliance" }
  ],
  "parties": [
    { "id": "institution", "name": "Assessed Institution", "kind": "assessed" },
    { "id": "cloud-provider", "name": "Cloud Service Provider", "kind": "third-party" }
  ],
  "objectives": [
    {
      "id": "SOV-1",
      "name": "Cryptographic Control",
      "description": "Protection of data assets via exclusive key ownership.",
      "weight": 50,
      "questions": [
        {
          "id": "SOV-1.key-custody",
          "scope": "dimension",
          "appliesTo": ["compute", "storage"],
          "text": "Who holds and manages the cryptographic keys used to encrypt data at rest?",
          "why": "Whoever controls the keys can decrypt data without organizational knowledge.",
          "role": "SEC",
          "defaultMateriality": "material",
          "ladder": [
            {
              "id": "r-0",
              "description": "Keys are fully managed and generated by the cloud provider.",
              "points": 0,
              "seal": 0
            },
            {
              "id": "r-1",
              "description": "Customer manages keys in the cloud provider's shared KMS.",
              "points": 40,
              "seal": 2
            },
            {
              "id": "r-2",
              "description": "Customer holds exclusive keys in an external on-premises or sovereign HSM (HYOK).",
              "points": 100,
              "seal": 4
            }
          ]
        }
      ]
    },
    {
      "id": "SOV-2",
      "name": "Legal Jurisdiction",
      "description": "Protection against extraterritorial judicial compulsion.",
      "weight": 50,
      "questions": [
        {
          "id": "SOV-2.jurisdiction",
          "scope": "party",
          "axis": "party",
          "text": "Is this provider subject to extraterritorial discovery or foreign jurisdiction seizure warrants?",
          "why": "Foreign legislation can compel vendors to disclose data without local court notification.",
          "role": "LEG",
          "defaultMateriality": "material",
          "ladder": [
            {
              "id": "j-0",
              "description": "Provider is headquartered in or controlled by an entity under foreign extraterritorial laws.",
              "points": 0,
              "seal": 0
            },
            {
              "id": "j-1",
              "description": "Provider operates under local jurisdiction with binding contractual immunity clauses.",
              "points": 60,
              "seal": 2
            },
            {
              "id": "j-2",
              "description": "Provider is purely local and immune to foreign extraterritorial compulsion.",
              "points": 100,
              "seal": 4
            }
          ]
        }
      ]
    }
  ],
  "testEstates": [],
  "recommendations": []
}
```

---

## 5. Deterministic Validation & Self-Healing Workflow

This skill is self-contained. It does not rely on having the source repository cloned.

When authoring or updating a workbook, follow this automated validation procedure:

### Step 1: Verify Node.js Availability
Before running automated validation, verify that Node.js is available in your execution environment:
```bash
node -v
```
- **If Node.js is NOT available:**
  You cannot execute the validation script. You must inform the user:
  > *"Node.js is required to validate the produced CSF workbook deterministically, but it is not available in the current environment. Please install Node.js (v18+) to enable automated verification, or manually verify your workbook against the Relational Invariants Checklist (R1 to R23)."*
  Carefully check every rule in Section 3 manually before presenting the workbook to the user.
- **If Node.js IS available:**
  Proceed to Step 2.

### Step 2: Execute the Validator Script
Run the validation script against the produced JSON workbook:
- If working inside the repository where `tools/skill/validate-workbook.mjs` exists:
  ```bash
  node tools/skill/validate-workbook.mjs path/to/generated-workbook.json
  ```
- If working in an isolated environment without repository access:
  Write the self-contained script from Section 6 below to a temporary file (for example `/tmp/validate-workbook.mjs`) and execute it:
  ```bash
  node /tmp/validate-workbook.mjs path/to/generated-workbook.json
  ```

### Step 3: Self-Healing Loop
- **If validation fails:** The validator outputs specific rule identifiers (such as `[R1: weightsTotal100]`, `[R6: appliesToNamesDeclaredDimension]`, or `[R22: pointsNeverFall]`) and the failing JSON property path.
  1. Inspect the reported rule violations and JSON paths.
  2. Modify the workbook JSON to resolve the issue.
  3. Re-run the validation script.
  4. Repeat until the validator outputs:
     ```
     ✓ path/to/workbook.json — valid CSF Workbook (v2.0)
     ```
- **If validation passes:** Provide the verified JSON document to the user and explain that it can be imported directly into the Author application.

---

## 6. Embedded Standalone Validator Script

Save the following zero-dependency Node.js script to validate any CSF workbook document. It verifies all structural requirements and cross-record relational invariants (R1 to R23) using only Node.js standard libraries:

```javascript
#!/usr/bin/env node
import fs from 'node:fs';

function validateWorkbook(wb) {
  const issues = [];
  function add(pathArray, message, ruleId) {
    issues.push({ path: pathArray.join('.'), message, ruleId });
  }

  if (!wb || typeof wb !== 'object' || Array.isArray(wb)) {
    return { ok: false, issues: [{ path: '', message: 'Workbook must be a JSON object.', ruleId: 'schema' }] };
  }

  if (wb.schemaVersion !== '2.0') {
    add(['schemaVersion'], 'schemaVersion must be "2.0".', 'schema');
  }

  if (!wb.meta || typeof wb.meta !== 'object') {
    add(['meta'], 'meta object is required.', 'schema');
  } else {
    if (!wb.meta.id || typeof wb.meta.id !== 'string') add(['meta', 'id'], 'meta.id is required string.', 'schema');
    if (!wb.meta.version || typeof wb.meta.version !== 'string') add(['meta', 'version'], 'meta.version is required string.', 'schema');
    if (!wb.meta.title || typeof wb.meta.title !== 'string') add(['meta', 'title'], 'meta.title is required string.', 'schema');
  }

  const seals = new Set();
  if (!Array.isArray(wb.sealLevels) || wb.sealLevels.length === 0) {
    add(['sealLevels'], 'sealLevels must be a non-empty array.', 'schema');
  } else {
    for (let i = 0; i < wb.sealLevels.length; i++) {
      const sl = wb.sealLevels[i];
      if (typeof sl.seal !== 'number' || sl.seal < 0 || sl.seal > 4 || !Number.isInteger(sl.seal)) {
        add(['sealLevels', i, 'seal'], 'SEAL level must be an integer between 0 and 4.', 'schema');
      } else if (seals.has(sl.seal)) {
        add(['sealLevels', i, 'seal'], `SEAL level ${sl.seal} appears more than once.`, 'R4: sealLevelsDistinct');
      } else {
        seals.add(sl.seal);
      }
    }
  }

  const dimensionIds = new Set();
  if (Array.isArray(wb.dimensions)) {
    for (let i = 0; i < wb.dimensions.length; i++) {
      const d = wb.dimensions[i];
      if (typeof d.id !== 'string' || d.id.length === 0) {
        add(['dimensions', i, 'id'], 'Dimension id must be a non-empty string.', 'schema');
      } else if (dimensionIds.has(d.id)) {
        add(['dimensions', i, 'id'], `Dimension ID "${d.id}" is duplicated.`, 'R7: dimensionIdsUnique');
      }
      dimensionIds.add(d.id);

      if (d.strata !== undefined) {
        if (!Array.isArray(d.strata) || d.strata.length < 2 || new Set(d.strata).size !== d.strata.length) {
          add(['dimensions', i, 'strata'], `Dimension "${d.id}" strata must contain 2 or more unique names.`, 'R8: strataAreTwoOrMoreUniqueNames');
        }
      }
    }
  }

  const roleIds = new Set();
  if (Array.isArray(wb.roles)) {
    for (let i = 0; i < wb.roles.length; i++) {
      const r = wb.roles[i];
      if (typeof r.id !== 'string' || r.id.length === 0) {
        add(['roles', i, 'id'], 'Role id must be a non-empty string.', 'schema');
      } else if (roleIds.has(r.id)) {
        add(['roles', i, 'id'], `Role ID "${r.id}" is duplicated.`, 'R13: roleIdsUnique');
      }
      roleIds.add(r.id);
    }
  }

  let assessedCount = 0;
  const partyTypeIds = new Set();
  if (Array.isArray(wb.parties)) {
    for (let i = 0; i < wb.parties.length; i++) {
      const p = wb.parties[i];
      if (typeof p.id !== 'string' || p.id.length === 0) {
        add(['parties', i, 'id'], 'Party id must be a non-empty string.', 'schema');
      } else if (partyTypeIds.has(p.id)) {
        add(['parties', i, 'id'], `Party ID "${p.id}" is duplicated.`, 'R15: partyTypeIdsUnique');
      }
      partyTypeIds.add(p.id);
      if (p.kind === 'assessed') assessedCount++;
    }
  }
  if (assessedCount !== 1) {
    add(['parties'], `Exactly one party must have kind: "assessed"; found ${assessedCount}.`, 'R16: exactlyOneAssessedPartyType');
  }

  const questionMap = new Map();
  let totalWeight = 0;
  const objIds = new Set();

  if (!Array.isArray(wb.objectives) || wb.objectives.length === 0) {
    add(['objectives'], 'objectives must be a non-empty array.', 'schema');
  } else {
    for (let oi = 0; oi < wb.objectives.length; oi++) {
      const obj = wb.objectives[oi];
      if (typeof obj.weight === 'number') {
        totalWeight += obj.weight;
      } else {
        add(['objectives', oi, 'weight'], 'Objective weight must be a number.', 'schema');
      }
      if (typeof obj.id !== 'string' || obj.id.length === 0) {
        add(['objectives', oi, 'id'], 'Objective id must be a non-empty string.', 'schema');
      } else if (objIds.has(obj.id)) {
        add(['objectives', oi, 'id'], `Objective ID "${obj.id}" is duplicated.`, 'R2: objectiveIdsUnique');
      }
      objIds.add(obj.id);

      if (!Array.isArray(obj.questions) || obj.questions.length === 0) {
        add(['objectives', oi, 'questions'], `Objective "${obj.id}" must contain at least one question.`, 'schema');
        continue;
      }

      for (let qi = 0; qi < obj.questions.length; qi++) {
        const q = obj.questions[qi];
        if (typeof q.id !== 'string' || q.id.length === 0) {
          add(['objectives', oi, 'questions', qi, 'id'], 'Question id must be a non-empty string.', 'schema');
        } else if (questionMap.has(q.id)) {
          add(['objectives', oi, 'questions', qi, 'id'], `Question ID "${q.id}" is duplicated across workbook.`, 'R3: questionIdsUniqueAcrossWorkbook');
        }
        questionMap.set(q.id, q);

        if (!roleIds.has(q.role)) {
          add(['objectives', oi, 'questions', qi, 'role'], `Question "${q.id}" names unknown role "${q.role}".`, 'R14: questionRoleIsDeclared');
        }

        if (q.scope === 'dimension') {
          if (!Array.isArray(q.appliesTo) || q.appliesTo.length === 0) {
            add(['objectives', oi, 'questions', qi, 'appliesTo'], `Dimension-scoped question "${q.id}" must have non-empty appliesTo array.`, 'schema');
          } else {
            for (let di = 0; di < q.appliesTo.length; di++) {
              if (!dimensionIds.has(q.appliesTo[di])) {
                add(['objectives', oi, 'questions', qi, 'appliesTo', di], `Question "${q.id}" applies to unknown dimension "${q.appliesTo[di]}".`, 'R6: appliesToNamesDeclaredDimension');
              }
            }
          }
        }

        if (!Array.isArray(q.ladder) || q.ladder.length === 0) {
          add(['objectives', oi, 'questions', qi, 'ladder'], `Question "${q.id}" ladder must contain at least one rung.`, 'schema');
        } else {
          const rungIds = new Set();
          for (let ri = 0; ri < q.ladder.length; ri++) {
            const rung = q.ladder[ri];
            if (typeof rung.id !== 'string' || rung.id.length === 0) {
              add(['objectives', oi, 'questions', qi, 'ladder', ri, 'id'], 'Rung id must be a non-empty string.', 'schema');
            } else if (rungIds.has(rung.id)) {
              add(['objectives', oi, 'questions', qi, 'ladder', ri, 'id'], `Rung ID "${rung.id}" is duplicated in question "${q.id}".`, 'R5: rungIdsUniqueAndSealsDeclared');
            }
            rungIds.add(rung.id);

            if (!seals.has(rung.seal)) {
              add(['objectives', oi, 'questions', qi, 'ladder', ri, 'seal'], `Rung SEAL ${rung.seal} in "${q.id}" is not defined in sealLevels.`, 'R5: rungIdsUniqueAndSealsDeclared');
            }

            if (typeof rung.points !== 'number' || rung.points < 0 || !Number.isFinite(rung.points)) {
              add(['objectives', oi, 'questions', qi, 'ladder', ri, 'points'], 'Rung points must be a non-negative number.', 'schema');
            }

            if (ri > 0) {
              const prev = q.ladder[ri - 1];
              if (rung.points < prev.points) {
                add(['objectives', oi, 'questions', qi, 'ladder', ri, 'points'], `Ladder for ${q.id} drops in points at rung ${ri + 1}; going up a ladder, points never fall.`, 'R22: pointsNeverFall');
              }
              if (rung.seal < prev.seal) {
                add(['objectives', oi, 'questions', qi, 'ladder', ri, 'seal'], `Ladder for ${q.id} drops in SEAL at rung ${ri + 1}; going up a ladder, SEAL never falls.`, 'R23: sealNeverFalls');
              }
            }
          }
        }
      }
    }

    if (totalWeight !== 100) {
      add(['objectives'], `Objective weights must sum to 100; got ${totalWeight}.`, 'R1: weightsTotal100');
    }
  }

  // Test estates validation
  const estateIds = new Set();
  if (Array.isArray(wb.testEstates)) {
    for (let ei = 0; ei < wb.testEstates.length; ei++) {
      const e = wb.testEstates[ei];
      if (estateIds.has(e.id)) {
        add(['testEstates', ei, 'id'], `Test estate ID "${e.id}" is duplicated.`, 'R9: testEstateIdsUnique');
      }
      estateIds.add(e.id);

      if (Array.isArray(e.parties)) {
        for (let pi = 0; pi < e.parties.length; pi++) {
          const p = e.parties[pi];
          if (!partyTypeIds.has(p.type)) {
            add(['testEstates', ei, 'parties', pi, 'type'], `Estate party "${p.id}" uses unknown party type "${p.type}".`, 'R17: estatePartiesResolve');
          }
          if (Array.isArray(p.serves)) {
            for (let si = 0; si < p.serves.length; si++) {
              if (!dimensionIds.has(p.serves[si])) {
                add(['testEstates', ei, 'parties', pi, 'serves', si], `Estate party "${p.id}" serves unknown dimension "${p.serves[si]}".`, 'R17: estatePartiesResolve');
              }
            }
          }
        }
      }

      if (Array.isArray(e.answers)) {
        const seenQ = new Set();
        for (let ai = 0; ai < e.answers.length; ai++) {
          const ans = e.answers[ai];
          if (!questionMap.has(ans.questionId)) {
            add(['testEstates', ei, 'answers', ai, 'questionId'], `Estate "${e.id}" answers unknown question "${ans.questionId}".`, 'R10: estateAnswersOneKnownQuestionEach');
          } else {
            if (seenQ.has(ans.questionId)) {
              add(['testEstates', ei, 'answers', ai, 'questionId'], `Estate "${e.id}" answers question "${ans.questionId}" more than once.`, 'R10: estateAnswersOneKnownQuestionEach');
            }
            seenQ.add(ans.questionId);
            const q = questionMap.get(ans.questionId);
            const validRung = q.ladder && q.ladder.some(r => r.id === ans.rungId);
            if (!validRung) {
              add(['testEstates', ei, 'answers', ai, 'rungId'], `Estate answer names unknown rung "${ans.rungId}" for question "${ans.questionId}".`, 'R11: estateAnswerNamesAuthoredRung');
            }
          }
        }
      }
    }
  }

  // Recommendations validation
  const recIds = new Set();
  const recs = Array.isArray(wb.recommendations) ? wb.recommendations : [];
  if (recs.length > 0) {
    if (!wb.recommender || !wb.recommender.name || !wb.recommender.disclosure) {
      add(['recommender'], 'recommender block with name and disclosure is required when recommendations exist.', 'R21: recommenderNamedWhenContentPresent');
    }
  }
  for (let ri = 0; ri < recs.length; ri++) {
    const rec = recs[ri];
    if (recIds.has(rec.id)) {
      add(['recommendations', ri, 'id'], `Recommendation ID "${rec.id}" is duplicated.`, 'R18: recommendationIdsUnique');
    }
    recIds.add(rec.id);
    if (!seals.has(rec.whenAtOrBelow)) {
      add(['recommendations', ri, 'whenAtOrBelow'], `Recommendation "${rec.id}" trigger SEAL ${rec.whenAtOrBelow} is not declared.`, 'R20: recommendationThresholdSealDeclared');
    }
    if (Array.isArray(rec.links)) {
      for (let li = 0; li < rec.links.length; li++) {
        const link = rec.links[li];
        if (link.kind === 'question' && !questionMap.has(link.id)) {
          add(['recommendations', ri, 'links', li, 'id'], `Recommendation links to unknown question "${link.id}".`, 'R19: recommendationLinksResolve');
        } else if (link.kind === 'dimension' && !dimensionIds.has(link.id)) {
          add(['recommendations', ri, 'links', li, 'id'], `Recommendation links to unknown dimension "${link.id}".`, 'R19: recommendationLinksResolve');
        } else if (link.kind === 'objective' && !objIds.has(link.id)) {
          add(['recommendations', ri, 'links', li, 'id'], `Recommendation links to unknown objective "${link.id}".`, 'R19: recommendationLinksResolve');
        }
      }
    }
  }

  return { ok: issues.length === 0, issues };
}

function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node validate-workbook.cjs <path-to-workbook.json>');
    process.exit(1);
  }
  if (!fs.existsSync(file)) {
    console.error(`✗ File not found: ${file}`);
    process.exit(1);
  }
  let json;
  try {
    json = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    console.error(`✗ Invalid JSON in ${file}: ${err.message}`);
    process.exit(1);
  }
  const result = validateWorkbook(json);
  if (!result.ok) {
    console.error(`\n✗ ${file} — FAILED validation with ${result.issues.length} issue(s):`);
    result.issues.forEach((issue, idx) => {
      const loc = issue.path ? ` path: ${issue.path}` : '';
      console.error(`  ${idx + 1}. [${issue.ruleId}]${loc}`);
      console.error(`     ${issue.message}`);
    });
    process.exit(1);
  }
  console.log(`\n✓ ${file} — valid CSF Workbook (v2.0)`);
}

if (require.main === module) {
  main();
}
```
