# Requirements — PGx clinical data layer

## Introduction

This spec covers the clinical data layer for Karyanomics: the reviewed,
versioned guidance data under `/data`, the shared PGx types, and the `assess()`
function in `lib/pgx` that maps a gene phenotype plus a drug (and clinical
context) to a source-backed recommendation. The first complete path is the
fictional persona **Maya** (CYP2C19 result) with **clopidogrel**.

Genetic data is processed entirely client-side and is never sent to a server.
All clinical wording comes from a reviewed source file, never from model memory.

## Glossary

- **Diplotype**: the pair of star alleles for a gene (e.g. CYP2C19 `*2/*2`).
- **Phenotype**: the metabolizer status derived from a diplotype (e.g. Poor
  Metabolizer).
- **Indication / clinical context**: the condition the drug is used for; CPIC
  clopidogrel recommendations differ by indication (ACS/PCI, non-ACS/non-PCI,
  neurovascular).
- **assess()**: pure function mapping (phenotype, drug, indication) to a result.

## Requirements

### Requirement 1: Reviewed, versioned guidance data

**User story:** As the clinical data owner, I want guidance stored in a
versioned file with full provenance, so that every recommendation traces back to
a real source and reviewers can audit it.

#### Acceptance criteria

1. WHEN guidance is stored THEN the system SHALL keep it in a versioned file
   under `/data` separate from application code.
2. WHERE a recommendation is stored THE system SHALL record the source URL, the
   guideline version or retrieval date, the clinical context/indication, and the
   recommendation strength.
3. THE system SHALL record a top-level data version and retrieval date for the
   file.
4. IF a source mapping is uncertain or unverified THEN the system SHALL mark it
   with a `needs_human_review` flag rather than presenting it as reviewed.
5. THE system SHALL NOT contain clinical recommendation wording that was
   generated from model memory; all wording SHALL be copied from the cited source.

### Requirement 2: Shared types

**User story:** As a developer, I want shared TypeScript types for genotype,
phenotype, and assessment results, so that the engine, UI, and data file agree
on one contract.

#### Acceptance criteria

1. THE system SHALL define shared types for phenotype input, supported
   gene–drug pairs, recommendation strength, assessment status, and the
   assessment result.
2. THE assessment result type SHALL distinguish a matched recommendation from an
   `Indeterminate` / insufficient-data outcome.
3. WHERE a result is matched THE result SHALL carry the source provenance
   (URL, version/date, strength, clinical context).

### Requirement 3: assess() matching

**User story:** As a patient-side feature, I want to assess a phenotype against a
drug and get a source-backed result, so that Maya's CYP2C19 + clopidogrel path
returns reviewed guidance.

#### Acceptance criteria

1. WHEN assess() receives a supported gene phenotype, a supported drug, and a
   matching indication THEN the system SHALL return a matched result with the
   reviewed recommendation text, strength, implications, and source.
2. WHEN assess() receives a phenotype of `Indeterminate` THEN the system SHALL
   return an `indeterminate` result and SHALL NOT return a recommendation.
3. WHEN assess() receives a drug or gene that is not in the reviewed data THEN
   the system SHALL return an `insufficient_data` result with a reason.
4. WHEN assess() receives a supported pair but no reviewed recommendation matches
   the given indication THEN the system SHALL return an `insufficient_data`
   result and SHALL NOT substitute a different indication's recommendation.
5. THE assess() function SHALL be pure and SHALL NOT perform any network or
   storage I/O.
6. THE system SHALL NOT compute or output a medication dose.

### Requirement 4: Client-side only

**User story:** As a patient, I want my genetic result to stay on my device, so
that it is never uploaded.

#### Acceptance criteria

1. THE assess() path SHALL run entirely client-side with no network calls.
2. THE system SHALL NOT log or transmit genotype or phenotype inputs.

### Requirement 5: Source inventory

**User story:** As a reviewer, I want a documented inventory of every external
source, so that I know what each source provides, how identifiers connect, and
which sources may back a PGx recommendation.

#### Acceptance criteria

1. THE system SHALL document each source (ClinPGx/CPIC, PharmCAT examples,
   openFDA, NPPES): what it provides, its identifiers, its license/terms, and
   whether it MAY support a PGx recommendation.
2. THE inventory SHALL state that only ClinPGx/CPIC content may back a PGx
   recommendation, and that openFDA and NPPES SHALL NOT.
3. THE inventory SHALL flag any mapping that needs human review.
