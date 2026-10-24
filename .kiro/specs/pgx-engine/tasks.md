# Tasks — PGx engine (VCF pipeline)

- [x] 1. Confirm shared types in `lib/pgx/types.ts`
  - `VcfVariant`, `ParsedVcf`, `AlleleDefinition`, `DiplotypeCall`,
    and `GeneResult.source` are present (the `callDiplotypes` stub was later
    replaced by `callStarAlleles`).
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

- [x] 4. Call diplotypes: `callStarAlleles(parsed)` in `lib/pgx/callStarAlleles.ts`
  - Done in the star-allele-caller spec (8 genes, answer-key tested).
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 5. Add CYP2D6 outside-call handling
  - Never calling CYP2D6 from VCF is done (always Indeterminate with the fixed
    explanation). Still to do: merge an optional outside call with
    `source: "outside-call"`.
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 6. Diplotype → phenotype lookup
  - Done inside `callStarAlleles` using `data/cpic-diplotype-phenotypes.json`.
  - _Requirements: 5.1, 5.2_

- [x] 7. Implement scoped `assess` for CYP2C19/clopidogrel/ACS-PCI
  - Pure, client-side lookup with source-linked demo rows; not clinically reviewed.
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 8. Complete qualified review of the CYP2C19 + clopidogrel demo snapshot
  - Source-linked rows exist but `humanClinicalReview` remains false. Confirm wording, population, source version and terms.
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

- [x] 10. Sample VCF-to-demo + unit tests
  - `maya.vcf` → CYP2C19 `*2/*2`, Poor Metabolizer, equals `maya.phenotype.json`,
    then assessed against clopidogrel/ACS-PCI → matched with source, no dose.
  - parseVcf line handling; callStarAlleles homo/hetero/missing; CYP2D6 cases.
  - _Requirements: 1.2, 1.3, 3.1, 3.2, 3.3, 4.3, 7.1, 7.2_

- [x] 11. Property-based (fast-check) caller and parser tests
  - `parseVcf` never throws on generated VCF text; no-variant VCF yields only
    reference/Indeterminate; patient text never contains stop/take/dose
    instructions.
  - _Requirements: 9.1, 9.2, 9.3_

- [ ] 12. Add independently validated coverage, FILTER/genotype-quality and assay provenance before routing uploaded VCFs to guidance.
- [x] 13. Reject ambiguous research calls and route activity scores from `DiplotypeCall` rather than a separate caller-independent field.
