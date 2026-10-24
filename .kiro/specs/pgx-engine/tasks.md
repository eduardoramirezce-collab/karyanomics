# Tasks — PGx engine (VCF pipeline)

- [ ] 1. Confirm shared types in `lib/pgx/types.ts`
  - `VcfVariant`, `AlleleDefinition`, `DiplotypeCall`, and `GeneResult.source` are type-only contracts.
  - Put implementations in `parse-vcf.ts` and `call-diplotypes.ts`; do not add throwing stubs to `types.ts`.
  - _Requirements: 1.1, 3.1, 4.2_

- [ ] 2. Implement `parseVcf(text)` in `lib/pgx/parse-vcf.ts`
  - Parse data lines into `VcfVariant`; set `phased` from `|` vs `/`; skip
    malformed lines and record line numbers; never throw; no I/O.
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 3. Add input validation (single-sample, GRCh38)
  - Reject non-single-sample or non-GRCh38 VCFs with a clear user-facing error
    before any result is produced.
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

- [ ] 9. Add the Maya sample patient + answer key
  - `data/samples/maya.vcf` (synthetic, labeled) and
    `data/samples/maya.phenotype.json` (PharmCAT reference output).
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
- Kai's VCF parser/caller, sample VCF and PharmCAT answer key remain open. Do not present the end-to-end pipeline as complete before these are tested together.
