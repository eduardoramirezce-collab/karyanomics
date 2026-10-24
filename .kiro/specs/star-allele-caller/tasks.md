# Tasks — Star allele caller

- [x] 1. Fetch script and pinned data
  - `scripts/fetch-pgx-definitions.mjs`, `npm run fetch:pgx-definitions`;
    writes `data/allele-definitions.json` and
    `data/cpic-diplotype-phenotypes.json` with provenance.
  - Tests (`tests/pgx-definitions.test.ts`): 8 genes, one reference allele each,
    letter arrays match positions, every position present in `maya.vcf` with the
    same REF and ALT.
  - _Requirements: 3.6, 8.1, 8.2, 8.3_

- [x] 2. Types
  - Per-gene `AlleleDefinition`, phenotype table types, extended `DiplotypeCall`;
    the old `callDiplotypes` stub is removed.
  - _Requirements: 1.1, 6.4_

- [x] 3. Gate, position checks, CYP2D6
  - _Requirements: 1.1, 1.3, 2.1, 3.1–3.5, 7.1_

- [x] 4. Matching and phase
  - _Requirements: 4.1–4.5, 5.1–5.5_

- [x] 5. Phenotype lookup
  - _Requirements: 6.1–6.5_

- [x] 6. Answer-key and property tests (`tests/callStarAlleles.test.ts`)
  - _Requirements: 9.1, 9.2, 10.1–10.3_

- [x] 7. Wire into the upload flow and update docs
  - `lib/pgx/analyzeVcf.ts`; upload summary shows "Genes determined: N of 9"
    only; calls are passed to `onParsed`.
