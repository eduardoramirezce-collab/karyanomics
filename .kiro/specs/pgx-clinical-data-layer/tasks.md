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
  - Matched (two phenotypes), indeterminate, unsupported drug, unmatched
    indication, provenance.
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 1.2_

## Remaining review work

- Have a qualified clinical reviewer verify the source-backed demo wording,
  population/indication mapping, and applicable usage terms before describing
  the snapshot as clinically reviewed.
- Integrate the synthetic persona in the frontend; it is not yet a user-facing
  persona picker.
