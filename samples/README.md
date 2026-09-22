# Samples

This directory contains various sample workbooks, assessments, and test fixtures designed to showcase, teach, and validate the Cloud Sovereignty Self-Assessment Framework. These samples represent a wide range of use cases—from faithful JSON representations of the European Commission's Cloud Sovereignty Framework calculator to educational workbooks highlighting the core structural mechanics of the platform, custom recommender integrations, and lightweight validation fixtures.

## 1. Complete European Commission Calculator

* **Path**: `ec-guidance-complete/`
* **Workbook ID**: `eu-csf-calculator`
* **Workbook Title**: "EU Cloud Sovereignty Framework — Sovereignty Calculator"
* **Particular Case/Scenario**:
  * This workbook is based on the **European Commission's Cloud Sovereignty Framework** (tender annex v1.2.1, Sovereignty assessment calculator, June 2026).
  * It represents a faithful conversion of the original EC spreadsheet calculator to JSON with the following modifications:
    1. **Choice cleanup**: Seven blank/unreadable answer rows carrying a SEAL tag with no text (rows 7, 17, 31, 33, 38, 48, 49) were dropped, reducing the total choices/rungs from 240 to 233.
    2. **Relaxed SEAL-4 Gating**: Five questions (`SOV-3.5`, `SOV-5.1`, `SOV-5.2`, `SOV-5.3`, `SOV-6.5`) score but never gate. This implements the EC's own published remedy (Implementation Guidance, Lessons learnt, p. 13) to prevent the SEAL-4 floor from being permanently blocked by unachievable regional supply chain dependencies (such as chips and hardware).
    3. **Fictitious Worked Example**: Reproduces fictitious values from the original spreadsheet to demonstrate the scoring instrument without measuring any active real-world entity.

### Metrics Summary:

* **Number of Questions**: 48
* **Objectives (8)**:
  * `SOV-1` (Strategic Sovereignty) — 8 questions
  * `SOV-2` (Legal & Jurisdictional Sovereignty) — 6 questions
  * `SOV-3` (Data & AI Sovereignty) — 5 questions
  * `SOV-4` (Operational Sovereignty) — 6 questions
  * `SOV-5` (Supply Chain Sovereignty) — 7 questions
  * `SOV-6` (Technology Sovereignty) — 5 questions
  * `SOV-7` (Security & Compliance Sovereignty) — 7 questions
  * `SOV-8` (Environmental Sustainability) — 4 questions
* **Dimensions (0)**: None (splits its questions across no dimensions; questions apply globally to the entire assessed estate).
* **Participants (2)**:
  * **Alex** (`alex.json` — 48 answers)
  * **Jane** (`jane.json` — 48 answers)
* **Party Types (1)**:
  * `assessed-organisation` (Assessed organisation — kind: `assessed`)
* **Recommendations (0)**: None
* **Test States / Estates (2)**:
  * `source-worked-example`: Reproduces the original spreadsheet's fictitious column E selections to demonstrate scoring.
  * `best-available-today`: A ceiling probe demonstrating a hypothetical fully-European provider taking top rungs everywhere except the five hardware/silicon questions (which are set to the second-from-top rung, choice-4).

## 2. Deep-Analysis European Commission Calculator

* **Path**: `ec-guidance-deep-analysis/`
* **Workbook ID**: `eu-csf-calculator-deep`
* **Workbook Title**: "EU Cloud Sovereignty Framework — Sovereignty Calculator (deep analysis)"
* **Particular Case/Scenario**:
  * This represents the **Deep-Analysis Variant** of the EC guidance workbook.
  * While the core 8 objectives and 48 questions are identical to the complete calculator, this workbook implements the EC’s implementation guidance on **"Depth of analysis"** (p. 12-13) by fanning out questions over:
    1. **Nine critical dimensions** of the technical layers.
    2. **Multi-party supply chains** (including contractors, subcontractors, and suppliers).
  * Specifically, 9 questions are asked per party, 19 once per technical dimension, and 20 keep the single global estate grain.

### Metrics Summary:

* **Number of Questions**: 48
* **Objectives (8)**: Identical to the complete calculator (`SOV-1` through `SOV-8`).
* **Dimensions (9)**:
  * `compute`, `storage`, `network`, `iam`, `platform`, `security`, `software-supply` (non-gating), `edge` (non-gating), `facilities` (non-gating).
* **Participants (2)**:
  * **Alex** (`alex.json` — 193 dimension/party-granular answers)
  * **Jane** (`jane.json` — 145 dimension/party-granular answers)
* **Party Types (4)**:
  * `assessed-organisation` (Assessed organisation — kind: `assessed`)
  * `contractor` (Contractor — kind: `third-party`)
  * `sub-contractor` (Sub-contractor — kind: `third-party`)
  * `supplier` (Supplier — kind: `third-party`)
* **Recommendations (0)**: None
* **Test States / Estates (2)**:
  * `source-worked-example`: Spreads fictitious selections across the chain and the nine dimensions.
  * `best-available-today`: Ceiling probe testing whether SEAL-4 is reachable once every layer and every entity is asked.

## 3. Basic Teaching Workbook

* **Path**: `learn-basics/`
* **Workbook ID**: `csf-teaching`
* **Workbook Title**: "Cloud Sovereignty Self-Assessment — Teaching Workbook"
* **Particular Case/Scenario**:
  * This is a **Teaching/Educational Showcase** designed to demonstrate every mechanic of the framework's model in miniature.
  * It compiles a minimal, single-objective workbook of exactly 5 questions designed to teach:
    1. *Dimension fan-out* (applying a single question across multiple components).
    2. *Strata splits* (splitting questions into sub-layers like service, software, hardware, chips).
    3. *Party fan-out* (asking questions across different supply-chain legal entities).
    4. *Sparse ladders, default materiality, criticality, and structural n/a*.

### Metrics Summary:

* **Number of Questions**: 5
* **Objectives (1)**:
  * `SOV-3` (Data & AI Sovereignty) — 5 questions
* **Dimensions (4)**:
  * `compute`, `network`, `aiml`, `edge`
* **Participants (0)**: None (only contains base template `workbook-assessment.json` with no participant).
* **Party Types (4)**:
  * `institution` (Institution — kind: `assessed`)
  * `primary-provider` (Primary provider — kind: `third-party`)
  * `subprocessor` (Subprocessor — kind: `third-party`)
  * `supplier` (Supplier — kind: `third-party`)
* **Recommendations (0)**: None
* **Test States / Estates (3)**:
  * `teach-median`: A balanced EU regional deployment on foreign-parented provider, with hand-kept inventory and customer keys.
  * `teach-hyperscaler`: Profile A in miniature (non-EU hyperscaler), showcasing how high-scoring paperwork can't lift a floor bound by physical custody or compellability.
  * `teach-sovereign`: Profile BASE in miniature (EU cooperative provider), showing how a single weak answer (like a manual, non-automated inventory) drags down the entire floor.

## 4. Deep-Analysis Teaching Workbook

* **Path**: `learn-deep-analysis/`
* **Workbook ID**: `csf-teaching-deep-analysis`
* **Workbook Title**: "Cloud Sovereignty Self-Assessment — Deep-Analysis Teaching Workbook"
* **Particular Case/Scenario**:
  * This is a **Deep-Analysis Teaching Showcase** designed to prove that the technical-dimensions diagram in the EC implementation guidance ("Depth of analysis", p. 12) is fully expressible inside the model.
  * It teaches how blocks map into dimensions, sub-boxes map into strata, and how sibling sub-blocks map to separate questions on a shared dimension (e.g., container and PaaS control on `platform`), eliminating the need for a third level of structural nesting.

### Metrics Summary:

* **Number of Questions**: 11
* **Objectives (2)**:
  * `DEEP-ENT` (Entity-chain analysis) — 2 questions (asked on the party axis/grain)
  * `DEEP-TEC` (Technical-layer analysis) — 9 questions (asked per technical dimension)
* **Dimensions (9)**:
  * `compute`, `storage`, `network`, `iam`, `platform`, `security`, `software-supply`, `edge`, `facilities`
* **Participants (1)**:
  * **Dana Meyer** (`assessment.json` — 24 granular answers)
* **Party Types (4)**:
  * `institution` (Institution — kind: `assessed`)
  * `service-provider` (Service provider — kind: `third-party`)
  * `subcontractor` (Sub-contractor — kind: `third-party`)
  * `supplier` (Supplier — kind: `third-party`)
* **Recommendations (0)**: None
* **Test States / Estates (3)**:
  * `deep-one-roof`: A baseline where one hyperscale provider serves all nine dimensions, leaving the floor at SEAL-0.
  * `deep-layered`: An EU provider running the service layer while hardware, chips, edge, and libraries stay foreign.
  * `deep-sovereign-ceiling`: The "lessons-learnt" estate where an EU cooperative runs every layer but compute/storage/network floor at SEAL-2 due to foreign silicon.

## 5. Estate Workbook with Recommendations

* **Path**: `recommendations/`
* **Workbook ID**: `csf-estate`
* **Workbook Title**: "Cloud Sovereignty Self-Assessment — Estate Workbook"
* **Particular Case/Scenario**:
  * This is an **Assessment Framework with Recommender and Offering Integration** that adapts the EC framework into a self-assessment of an existing cloud estate.
  * This workbook is uniquely customized to demonstrate the **SUSE Recommender integration**:
    * Author: **SUSE** (includes contact triggers, expert talk channels, and product offerings like *SUSE Sovereign Premium Support*).
    * It embeds **11 detailed, actionable recommendations** triggered dynamically when an assessment score floors at or below specific SEAL levels (using `whenAtOrBelow`).

### Metrics Summary:

* **Number of Questions**: 35
* **Objectives (8)**:
  * `SOV-1` (Strategic Sovereignty) — 3 questions
  * `SOV-2` (Legal & Jurisdictional Sovereignty) — 3 questions
  * `SOV-3` (Data & AI Sovereignty) — 6 questions
  * `SOV-4` (Operational Sovereignty) — 6 questions
  * `SOV-5` (Supply Chain Sovereignty) — 5 questions
  * `SOV-6` (Technology Sovereignty) — 4 questions
  * `SOV-7` (Security & Compliance Sovereignty) — 5 questions
  * `SOV-8` (Environmental Sustainability) — 3 questions (marked informational)
* **Dimensions (10)**:
  * `compute`, `storage`, `network`, `iam`, `platform`, `aiml`, `software-supply`, `security`, `edge`, `facilities`
* **Participants (2)**:
  * **Alex** (`partial-Alex.json` — 81 answers)
  * **Jane** (`partial-Jane.json` — 61 answers)
* **Party Types (4)**:
  * `institution` (Institution — kind: `assessed`)
  * `service-provider` (Service provider — kind: `third-party`)
  * `subcontractor` (Sub-contractor — kind: `third-party`)
  * `supplier` (Supplier — kind: `third-party`)
* **Recommendations (11)**: 11 recommendations authored by SUSE, mapping strategic, tactical, and operational advice.
* **Test States / Estates (3)**:
  * `profile-a`: Hyperscaler tenancy with high-quality compliance paperwork, demonstrating "ceiling-leak resistance" where the floor remains pinned at SEAL-0.
  * `profile-base`: EU cooperative stack with thin paperwork, flooring at SEAL-1 due to unverified hardware origin and untested exits.
  * `profile-m`: "Median EU institution" (the comparison standard; EU regions on a foreign-parented provider, an AI subprocessor, and foreign silicon, flooring at SEAL-1).

## 6. Test Fixtures Workbooks

* **Path**: `test-fixtures/`

This directory houses workbook templates strictly designed as lightweight and complete fixtures for unit testing, rendering validation, and scoring verification engines.

### 6.1 Standard CSF Workbook

* **File**: `csf-workbook.json`
* **Workbook ID**: `csf`
* **Workbook Title**: "Cloud Sovereignty Self-Assessment"
* **Particular Case/Scenario**:
  * Full-featured standard self-assessment workbook template used for testing core platform workflows and validating scoring engines.
* **Number of Questions**: 39
* **Objectives (8)**: `SOV-1` through `SOV-8` (similar question distribution to the `recommendations` estate workbook, with minor question-count variations like 7 questions under `SOV-4` instead of 6).
* **Dimensions (10)**: `compute`, `storage`, `network`, `iam`, `platform`, `aiml`, `software-supply`, `security`, `edge`, `facilities`
* **Participants (0)**: None
* **Party Types (4)**: `institution` (assessed), `primary-provider` (third-party), `subprocessor` (third-party), `supplier` (third-party)
* **Recommendations (0)**: None
* **Test States / Estates (3)**: `profile-a`, `profile-base`, `profile-m` (Standard baseline profiles)

### 6.2 S7 Sample Workbook

* **File**: `sample-workbook.json`
* **Workbook ID**: `csf-sample`
* **Workbook Title**: "Cloud Sovereignty Self-Assessment — Sample (S7)"
* **Particular Case/Scenario**:
  * Truncated, minimalist workbook template designed specifically as a testing stub to verify S7-level scoring, fast-path rendering, and UI validations.
* **Number of Questions**: 5
* **Objectives (2)**:
  * `SOV-2` (Legal & Jurisdictional Sovereignty) — 4 questions
  * `SOV-6` (Technology Sovereignty) — 1 question
* **Dimensions (9)**: `compute`, `storage`, `network`, `iam`, `platform`, `security`, `aiml`, `edge`, `facilities`
* **Participants (0)**: None
* **Party Types (4)**: `institution` (assessed), `primary-provider` (third-party), `subprocessor` (third-party), `supplier` (third-party)
* **Recommendations (0)**: None
* **Test States / Estates (0)**: None defined
