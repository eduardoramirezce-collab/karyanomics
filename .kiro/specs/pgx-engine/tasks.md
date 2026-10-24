# Tasks — PGx engine (VCF pipeline)

- [x] 1. Confirm shared types in `lib/pgx/types.ts`
  - `VcfVariant`, `ParsedVcf`, `AlleleDefinition`, `DiplotypeCall`,
    `GeneResult.source`, and the `callDiplotypes` stub are present.
  - _Requirements: 1.1, 3.1, 4.2_

- [x] 2. Implement `parseVcf(text)` in `lib/pgx/parseVcf.ts`
  - Done in the vcf-input spec. Returns `ParsedVcf` (variants + warnings +
    skipped lines); never throws; no I/O.
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 3. Gate results on input validation (single-sample, GRCh38)
  - `parseVcf` only warns (`build_not_grch38`, `build_unknown`,
    `multiple_samples`, `no_samples`). Before any gene result is produced, turn
    the blocking warnings into a clear user-facing error.
  - _Requirements: 2.1, 2.2_

- [ ] 4. Implement `callDiplotypes(variants, defs)` in `lib/pgx/call-diplotypes.ts`
  - Match variants to allele definitions per chromosome → homozygous /
    heterozygous diplotype; missing defining position → Indeterminate (never
    assume reference); read defs from `data/allele-definitions.json`; pure, no I/O.
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 5. Add CYP2D6 outside-call handling
  - Never call CYP2D6 from VCF; merge an optional outside call with
    `source: "outside-call"`; absent → Indeterminate with the fixed explanation.
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 6. Implement diplotype → phenotype lookup in `lib/pgx/phenotype.ts`
  - Map diplotype to CPIC standard phenotype; no mapping → Indeterminate.
  - _Requirements: 5.1, 5.2_

- [ ] 7. Implement `assess(phenotype, drug, indication)` in `lib/pgx/assess.ts`
  - Pure, client-side, no dose, no I/O; matched / indeterminate /
    insufficient_data with reasons; reads reviewed CPIC data file.
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 8. Create the reviewed CYP2C19 + clopidogrel data file
  - Verbatim CPIC recommendation text; source url, cpic version, retrieval date,
    indication, strength. No model-authored clinical wording.
  - _Requirements: 6.1_

- [ ] 8a. Pull and review CPIC data for the remaining guidelines
  - CYP2C19 + SSRIs (citalopram, escitalopram, sertraline); CYP2C19 + PPIs
    (omeprazole); CYP2C9/VKORC1/CYP4F2 + warfarin; SLCO1B1/ABCG2 + statins
    (simvastatin, rosuvastatin); TPMT/NUDT15 + thiopurines (azathioprine,
    mercaptopurine); CYP2D6 + opioids (codeine, tramadol) and ondansetron.
  - Same rules as task 8: verbatim text, full provenance, human review.
  - _Requirements: 6.1, 6a.1, 6a.2, 6a.3_

- [ ] 8b. Handle multi-gene drugs in `assess`
  - Warfarin, rosuvastatin, thiopurines use every gene their guideline needs;
    an Indeterminate required gene never yields a result shown as complete.
  - _Requirements: 6a.1, 6a.2, 6a.3, 6a.4_

- [x] 9. Add the Maya sample patient + answer key
  - `public/samples/maya.vcf` (synthetic, labeled) and
    `data/samples/maya.phenotype.json` (PharmCAT reference output).
    Done in the vcf-input spec, with Alex and Sam as well.
  - _Requirements: 7.1_

- [ ] 10. End-to-end + unit tests
  - `maya.vcf` → CYP2C19 `*2/*2`, Poor Metabolizer, equals `maya.phenotype.json`,
    then assessed against clopidogrel/ACS-PCI → matched with source, no dose.
  - parseVcf line handling; callDiplotypes homo/hetero/missing; CYP2D6 cases.
  - _Requirements: 1.2, 1.3, 3.1, 3.2, 3.3, 4.3, 7.1, 7.2_

- [ ] 11. Property-based (fast-check) safety tests
  - `parseVcf` never throws on generated VCF text; no-variant VCF yields only
    reference/Indeterminate; patient text never contains stop/take/dose
    instructions.
  - _Requirements: 9.1, 9.2, 9.3_
