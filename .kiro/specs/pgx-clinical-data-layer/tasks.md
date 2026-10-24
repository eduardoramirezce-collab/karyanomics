# Tasks — PGx clinical data layer

- [ ] 1. Write the source inventory
  - Document ClinPGx/CPIC, PharmCAT examples, openFDA, NPPES: what each provides,
    identifiers, license, and whether it may back a PGx recommendation.
  - Flag mappings needing human review.
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 2. Define shared types in `lib/pgx/types.ts`
  - Phenotype input, supported pairs, strength, status, assessment result union.
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 3. Create reviewed, versioned data file for CYP2C19 + clopidogrel
  - Copy CPIC recommendation text verbatim; record source url, cpic version,
    retrieval date, clinical context, strength.
  - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [ ] 4. Implement `assess()` in `lib/pgx/assess.ts`
  - Pure, client-side, no dose, no I/O. Handle matched / indeterminate /
    insufficient_data with reasons.
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2_

- [ ] 5. Add the Maya demo persona (synthetic, labeled)
  - _Requirements: 1.4 (labeling synthetic data)_

- [ ] 6. Test matching and Indeterminate cases
  - Matched (two phenotypes), indeterminate, unsupported drug, unmatched
    indication, provenance.
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 1.2_
