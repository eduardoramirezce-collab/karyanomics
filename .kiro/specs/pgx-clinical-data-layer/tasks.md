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

## Eight target genes (2026-10-24)

- [x] Limit the target catalog to CYP2C19, CYP2C9, VKORC1, SLCO1B1, TPMT, NUDT15, CYP4F2, and ABCG2, while retaining Kai's full PharmCAT 3.4.0 sample reports as validation fixtures.
- [x] Join these eight genes to current, non-provisional CPIC A/B `pair_view` metadata. Store a versioned research-only index with exact RxNorm IDs and guideline URLs; 41 pair entries cover all eight genes.
- [x] Provide an exact drug/RxNorm candidate lookup that groups multi-gene pairs without generating patient advice.
- [ ] Review source usage terms and each guideline's recommendation lookup key, other required genes, population, and indication before extending `assess()` beyond CYP2C19/clopidogrel ACS/PCI.
- [ ] Validate Kai's future allele/phenotype caller against the sample answer keys before connecting any new personalized guidance.

## Exact source-row routing while caller is pending (2026-10-24)

- [x] Research CPIC recommendation lookup keys for the priority clopidogrel, thiopurine, statin, and warfarin guidelines.
- [x] Version 134 exact research-only recommendation IDs/lookup keys with source guideline versions; exclude no-result rows and keep prescribing text out of the routing file.
- [x] Match exact drug/RxNorm, population, required genes, phenotype, and CYP2C9 activity score; reject missing or incomplete caller evidence. Mark warfarin as algorithm-required.
- [x] Record Kai's caller handoff fields and clinical-review gates in `docs/PHENOTYPE_TO_GUIDANCE_RESEARCH.md`.
- [ ] Confirm ClinPGx usage terms and have qualified clinical review of the additional source rows before any new patient or clinician guidance is published.
- [ ] Connect the validated Kai caller only after it provides the required per-gene evidence and passes PharmCAT fixture comparison.

## Medication browsing taxonomy (2026-10-24)

- [x] Map all ten CPIC guideline families and 34 distinct RxNorm ingredients into the team's nine therapeutic areas; preserve medication family, indexed genes, and guideline link.
- [x] Add a `/drugs` research catalog linked from patient intake, with explicit empty Endocrine and Miscellaneous groups and no patient-response claims.
- [x] Test complete one-time ingredient coverage, multi-gene aggregation, and exact identity. Record the editorial/source distinction in the API register and steering.
- [ ] Validate broader classes and cross-indication use with NLM RxClass and qualified clinical review before treating the taxonomy as a clinical classification.

## Generic and brand display names (2026-10-24)

- [x] Pin NLM Prescribable RxNorm release/version and current U.S. brand aliases for all 34 CPIC ingredients, with BN/SBD provenance and no combination or veterinary-only brands.
- [x] Add a candidate-only refresh script, snapshot validation, exact display search, `/drugs` names, NLM attribution, and tests.
- [ ] Add validated NDC/product-to-ingredient resolution before using a brand or scanned package to enter PGx guidance.

## Status audit follow-ups (2026-10-24, Edu)

See `docs/STATUS_AUDIT_2026-10-24.md`.

- [ ] Replace caller-supplied `callStatus` / `CallerEvidence` in `sample-assessment.ts`, `assess.ts`, `assess-patient.ts` and `research-recommendation-route.ts` with Kai's computed per-gene evidence once it lands. `toMayaSampleAssessment` currently treats FILTER `.` as passing.
- [ ] Decide whether to add the CPIC "Likely Intermediate/Poor Metabolizer" ACS/PCI rows (IDs 8480386, 8480388) to the demo snapshot; today they return `insufficient_data`.
- [ ] Add `lib/pgx/drug-identity.ts`: exact NDC → RxNorm ingredient(s), combination products rejected or split, with a candidate-only refresh script and validator.
- [ ] Build `app/physician/` and `app/api/npi/` with real identity controls before showing clinician CPIC wording.
- [ ] Review monthly source changes and consider a separately labeled historical/non-U.S. alias index if needed for medication-history search.
