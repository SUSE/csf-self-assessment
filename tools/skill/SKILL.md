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

## 5. Iterative Generation & Validation Workflow

When assisting a user to create or update a workbook:

1. **Clarify Requirements:** Determine the domain (e.g., Sovereign AI, Bare-metal Kubernetes, Healthcare cloud), objectives, dimensions, and participant roles.
2. **Draft the JSON Document:** Follow the 7 decisions, maintain the 100-point weight budget, and ensure all cross-record IDs resolve.
3. **Run the Validator CLI:**
   ```bash
   node tools/validate-workbook.mjs path/to/generated-workbook.json
   ```
4. **Self-Heal Any Errors:** If the validator outputs issues (e.g. `[R1]`, `[R6]`, `[R22]`), locate the reported paths in the JSON, fix the invariant violation, and re-run validation until it outputs:
   ```
   ✓ path/to/workbook.json — valid CSF Workbook (v2.0)
   ```
5. **Import into Author App:** Once validated, the JSON file can be imported directly into `author.html` or the Author web application.
