# Tasks — PGx clinical data layer

- [x] 1. Write the source inventory
  - Document ClinPGx/CPIC, PharmCAT examples, openFDA, NPPES: what each provides,
    identifiers, license, and whether it may back a PGx recommendation.
  - Flag mappings needing human review.
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 2. Define shared types in `lib/pgx/types.ts`
  - Phenotype input, supported pairs, strength, status, assessment result union.
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 3. Create versioned demo data file for CYP2C19 + clopidogrel
  - Record source URL, recommendation IDs, CPIC version, retrieval date,
    clinical context, strength, and pending clinical-review status.
  - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [x] 4. Implement `assess()` in `lib/pgx/assess.ts`
  - Pure, client-side, no dose, no I/O. Handle matched / indeterminate /
    insufficient_data with reasons.
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2_

- [x] 5. Add the Maya demo persona (synthetic, labeled)
  - _Requirements: 1.4 (labeling synthetic data)_

- [x] 6. Test matching and Indeterminate cases
  - Matched (five phenotypes), indeterminate, unsupported drug, unmatched
    indication, provenance.
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 1.2_

## Remaining review work

- Have a qualified clinical reviewer verify the source-backed demo wording,
  population/indication mapping, and applicable usage terms before describing
  the snapshot as clinically reviewed.
- The synthetic phenotype is exposed only as a separate example, not as a result of a selected sample VCF.

## Upload and source-awareness increment (2026-10-24)

- [x] Parse structured PGx JSON, VCF and four-column consumer raw text locally; classify no-call, review-required and external-caller states.
- [x] Add a patient intake page that never uploads genetic content or displays clinician-only recommendation wording.
- [x] Add a synthetic sample file and parser tests.
- [x] Maintain an implemented-vs-planned API register, change log and gap list.
- [ ] Select a real de-identified lab export and document field/quality mapping.
- [ ] Add a validated allele/phenotype pipeline for GRCh38 VCF and outside calls; pin source/tool versions.
- [ ] Build clinician review/authentication before interpreting real uploads.
- [ ] Add RxNorm drug normalization and NDC mapping with tests before multi-drug lookups.

## Phenotype → guidance increment (2026-10-24)

- [x] Merge the VCF/`DiplotypeCall` type contract from main without modifying Kai's parser/caller.
- [x] Match five CYP2C19 phenotypes to exact clopidogrel ACS/PCI CPIC recommendation IDs.
- [x] Accept only exact clopidogrel or RxNorm:32968 identifiers; keep NDC/brand normalization out of scope until sourced.
- [x] Reject self-reported lab-report calls, even when their own JSON says complete.
- [x] Merge Kai's VCF parser, upload component, and sample reference fixtures without duplicating VCF parsing or presenting a parsed file as verified.
- [x] Compare the CYP2C19 rows in Kai's PharmCAT reference reports with the exact CPIC guidance lookup in a fixture-only handoff test. This validates shared vocabulary, not VCF allele calling.
- [ ] Integrate with Kai's allele/phenotype caller after it is implemented and validated; verify sample VCF → phenotype → guidance end to end.
