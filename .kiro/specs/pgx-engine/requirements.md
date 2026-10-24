# Requirements — PGx engine (VCF pipeline)

## Introduction

This spec covers the PGx engine: the client-side pipeline that turns a genotype
**VCF file** into a cited, source-backed recommendation. Nothing is hand-made;
every result is computed from the file. The pipeline is:

1. **Input:** a single-sample GRCh38 VCF (user upload or a bundled sample),
   plus an optional "outside call" input for CYP2D6.
2. **Parse VCF** (`parseVcf`): read `CHROM`, `POS`, `REF`, `ALT`, and the
   sample's `GT` field (phased `|` or unphased `/`) into `VcfVariant[]`.
3. **Call star alleles** (`callDiplotypes`): match variants at defined positions
   to star alleles and produce a diplotype per gene (e.g. CYP2C19 `*2/*2`).
4. **Diplotype → phenotype** using CPIC tables (e.g. Poor Metabolizer).
5. **Phenotype + drug → CPIC recommendation** (`assess`).
6. **Report:** a plain-language patient view and a clinician view (behind the
   NPI gate).

Genes called from VCF: **CYP2C19, CYP2C9, VKORC1, SLCO1B1, TPMT.** CYP2D6 is not
callable from a VCF and comes only from the optional outside-call input. DPYD and
NUDT15 are out of scope for VCF calling today.

Genetic data is processed entirely client-side and is never sent to a server.
All clinical wording comes from a reviewed source file, and all allele positions
come from `data/allele-definitions.json` — never from model memory.

## Glossary

- **VCF**: Variant Call Format — a text file of genetic variants, one per data
  line, with a `GT` genotype field per sample.
- **Single-sample VCF**: a VCF with exactly one sample column.
- **GT**: the genotype field, allele indices (0 = REF, 1 = first ALT, …)
  separated by `|` (phased) or `/` (unphased).
- **Diplotype**: the pair of star alleles for a gene (e.g. CYP2C19 `*2/*2`).
- **Phenotype**: the metabolizer status derived from a diplotype (e.g. Poor
  Metabolizer).
- **Outside call**: a CYP2D6 diplotype/phenotype supplied directly by the user,
  since CYP2D6 cannot be called from a VCF.
- **Indication / clinical context**: the condition the drug is used for; CPIC
  clopidogrel recommendations differ by indication (ACS/PCI, non-ACS/non-PCI,
  neurovascular).

## Requirements

### Requirement 1: Parse a single-sample VCF

**User story:** As the engine, I want to parse a VCF into structured variant
records, so that later stages can match variants to star alleles.

#### Acceptance criteria

1. WHEN a valid single-sample VCF is provided THEN the system SHALL parse every
   data line into a `VcfVariant` with `chrom`, `pos`, `ref`, `alt`, `gt`, and
   `phased`.
2. WHEN a VCF line is malformed THEN the system SHALL skip it and report the
   line number, and SHALL NOT crash.
3. WHEN a genotype field uses `|` THEN the system SHALL set `phased` to true;
   WHEN it uses `/` THEN the system SHALL set `phased` to false.
4. THE `parseVcf` function SHALL NOT perform any network or storage I/O.

### Requirement 2: Validate input shape

**User story:** As a patient, I want the app to refuse files it cannot safely
interpret, so that I never get a result computed from the wrong assumptions.

#### Acceptance criteria

1. WHEN a VCF is not single-sample THEN the system SHALL reject it with a clear
   user-facing error and SHALL NOT produce a result.
2. WHEN a VCF is not GRCh38 THEN the system SHALL reject it with a clear
   user-facing error and SHALL NOT produce a result.

### Requirement 3: Call diplotypes from variants

**User story:** As the engine, I want to call a diplotype per gene from parsed
variants, so that each gene resolves to star alleles or to Indeterminate.

#### Acceptance criteria

1. WHEN variants match an allele definition on both chromosomes THEN the system
   SHALL return the homozygous diplotype (e.g. `*2/*2`).
2. WHEN variants match different allele definitions on each chromosome THEN the
   system SHALL return the heterozygous diplotype (e.g. `*1/*2`).
3. WHEN a gene's defining positions are missing from the VCF THEN the system
   SHALL return `Indeterminate` for that gene and SHALL NOT assume reference.
4. WHERE allele definitions are read THE system SHALL read them from
   `data/allele-definitions.json` and SHALL NOT use any invented position.
5. THE `callDiplotypes` function SHALL be pure and SHALL NOT perform any network
   or storage I/O.

### Requirement 4: CYP2D6 via outside call only

**User story:** As a clinician, I want CYP2D6 handled honestly, so that the app
never claims a CYP2D6 result it cannot support from a VCF.

#### Acceptance criteria

1. THE system SHALL NOT call CYP2D6 from VCF variants.
2. WHEN a CYP2D6 outside call is provided THEN the system SHALL use it and SHALL
   mark the result `source: "outside-call"`.
3. WHEN no CYP2D6 outside call is provided THEN the system SHALL return
   `Indeterminate` for CYP2D6 with the explanation "CYP2D6 cannot be determined
   from this file."

### Requirement 5: Diplotype to phenotype

**User story:** As the engine, I want to map a diplotype to a phenotype using
CPIC tables, so that recommendations key off a standard phenotype term.

#### Acceptance criteria

1. WHEN a gene has a called diplotype THEN the system SHALL map it to a CPIC
   standard phenotype term (e.g. "Poor Metabolizer").
2. WHEN a diplotype has no phenotype mapping in the CPIC table THEN the system
   SHALL return `Indeterminate` and SHALL NOT guess.

### Requirement 6: Assess a phenotype against a drug

**User story:** As a patient-side feature, I want to assess a phenotype against a
drug and get a source-backed result, so that the result traces to a real source.

#### Acceptance criteria

1. WHEN `assess` receives a supported phenotype, a supported drug, and a matching
   indication THEN the system SHALL return a matched result with the reviewed
   recommendation text, strength, implications, and source.
2. WHEN `assess` receives a phenotype of `Indeterminate` THEN the system SHALL
   return an `indeterminate` result and SHALL NOT return a recommendation.
3. WHEN `assess` receives a drug or gene not in the reviewed data THEN the system
   SHALL return an `insufficient_data` result with a reason.
4. WHEN `assess` receives a supported pair but no reviewed recommendation matches
   the indication THEN the system SHALL return `insufficient_data` and SHALL NOT
   substitute a different indication's recommendation.
5. THE `assess` function SHALL be pure, SHALL NOT perform network or storage
   I/O, and SHALL NOT compute or output a medication dose.

### Requirement 7: End-to-end sample (Maya)

**User story:** As a judge, I want the Maya sample to produce a known result, so
that the full pipeline is demonstrably correct against an answer key.

#### Acceptance criteria

1. WHEN `maya.vcf` is processed THEN the system SHALL return CYP2C19 `*2/*2`,
   Poor Metabolizer, matching `data/samples/maya.phenotype.json`.
2. WHEN the Maya result is assessed against `clopidogrel` for ACS/PCI THEN the
   system SHALL return a matched, source-backed recommendation.

### Requirement 8: Client-side only

**User story:** As a patient, I want my genetic file to stay on my device, so
that it is never uploaded.

#### Acceptance criteria

1. THE VCF pipeline SHALL run entirely client-side with no network calls.
2. THE system SHALL NOT log or transmit VCF contents, variants, diplotypes, or
   phenotypes to any server route or external service.

### Requirement 9: Safety properties (property-based tests)

**User story:** As a reviewer, I want safety rules encoded as properties, so that
they hold across arbitrary inputs, not just chosen examples.

#### Acceptance criteria

1. THE system SHALL hold the property that `parseVcf` never throws on any
   generated VCF text.
2. THE system SHALL hold the property that any VCF with no variant calls produces
   only reference or `Indeterminate` results (never a called non-reference
   diplotype).
3. THE system SHALL hold the property that patient-facing text never contains
   stop/take/dose instructions.
