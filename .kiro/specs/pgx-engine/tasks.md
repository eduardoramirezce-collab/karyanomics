# Tasks — PGx engine (VCF pipeline)

- [x] 1. Confirm shared types in `lib/pgx/types.ts`
  - `VcfVariant`, `ParsedVcf`, `AlleleDefinition`, `DiplotypeCall`, and `GeneResult.source` are shared contracts. Implementations belong in their own modules; `types.ts` has no throwing stubs.
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

- [x] 7. Implement the scoped `assess(geneResults, drug, indication, callStatus)` in `lib/pgx/assess.ts`
  - Pure, no I/O; matched / indeterminate / insufficient_data with reasons. CYP2C19 + clopidogrel + ACS/PCI only; uploaded calls do not pass the verification gate.
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 8. Complete qualified review of the CYP2C19 + clopidogrel data file
  - Five source-linked rows exist; all remain `humanClinicalReview: false`. Confirm indication, wording, version, and usage terms before treating the snapshot as clinically reviewed.
  - _Requirements: 6.1_

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

## Branch handoff status (2026-10-24)

- Edu's `clinical-data` branch implements step 7 for one exact gene/drug/indication: CYP2C19 + clopidogrel + ACS/PCI, with five phenotype rows. Source-linked wording is **not yet clinically reviewed**, so task 8 is still open as written.
- Kai's `parseVcf`, VCF upload UI, sample VCFs and PharmCAT answer keys are merged from `feature/vcf-input`. The allele/phenotype caller remains open. No parsed VCF is fed to `assess` yet.
