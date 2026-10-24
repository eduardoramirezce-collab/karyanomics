# Requirements — Star allele caller

## Introduction

This spec covers pipeline stages 3 and 4: turning a `ParsedVcf` into one result
per gene with a star-allele diplotype, a CPIC phenotype, and (where CPIC uses
one) an activity score.

```
ParsedVcf ──► callStarAlleles() ──► DiplotypeCall[] ──► assess(drug)
                (diplotype + CPIC phenotype per gene)
```

- `lib/pgx/callStarAlleles.ts`: pure function, runs in the browser.
- `data/allele-definitions.json`: defining positions and named alleles for each
  gene, from PharmCAT v3.4.0 (pinned).
- `data/cpic-diplotype-phenotypes.json`: CPIC diplotype → phenotype table.
- `scripts/fetch-pgx-definitions.mjs`: regenerates both data files at build time.

Genes called from the VCF: CYP2C19, CYP2C9, VKORC1, CYP4F2, SLCO1B1, ABCG2, TPMT,
NUDT15. CYP2D6 is never called from a VCF.

## Glossary

- **Defining position**: a genomic position listed in a gene's PharmCAT
  definition. Every named allele of the gene has an expected letter there.
- **Named allele**: a star allele (e.g. `*2`) or named variant (e.g.
  `rs9923231 variant (T)`) with an expected letter at each defining position. A
  blank (`null`) means the reference letter.
- **Haplotype**: the letters on one chromosome copy across a gene's defining
  positions.
- **Arrangement**: one way to split unphased heterozygous letters between the two
  copies.
- **Trans**: the variants of a heterozygous gene sit on different copies.
- **Not applicable phenotype**: CPIC assigns no phenotype for the gene (VKORC1,
  CYP4F2); guidelines use the genotype directly. Shown as `phenotype: null`.
- **Indeterminate**: the gene could not be called. `diplotype: null`,
  `phenotype: "Indeterminate"`, with a note giving the reason.

## Requirements

### Requirement 1: One result per gene

**User story:** As the engine, I want exactly one result per supported gene, so
that later stages never have to guess whether a gene was skipped.

#### Acceptance criteria

1. THE system SHALL return exactly one `DiplotypeCall` for each of CYP2C19, CYP2C9,
   VKORC1, CYP4F2, SLCO1B1, ABCG2, TPMT, NUDT15, and CYP2D6, in that order, for any
   `ParsedVcf`.
2. THE `callStarAlleles` function SHALL be pure, SHALL NOT perform network or
   storage I/O, SHALL NOT log genotypes, and SHALL NOT throw for any `ParsedVcf`.
3. WHEN a gene cannot be called THE system SHALL return it as Indeterminate with a
   plain-language `note` explaining why, never omit it.

### Requirement 2: File-level gate

**User story:** As a clinician, I want no gene called from a file built on the
wrong reference, so that positions are never misread.

#### Acceptance criteria

1. WHEN the `ParsedVcf` carries a `build_not_grch38`, `build_unknown`, or
   `no_samples` warning THE system SHALL return every gene as Indeterminate, with
   that warning's message as the note.

### Requirement 3: Defining positions must be present and readable

**User story:** As a patient, I want a gene left undetermined when my file is
missing data, so that missing data is never reported as normal.

#### Acceptance criteria

1. IF any defining position of a gene is absent from the VCF THEN THE system SHALL
   return that gene as Indeterminate and SHALL NOT assume the reference allele.
2. IF the genotype at any defining position of a gene is a full or partial no-call
   THEN THE system SHALL return that gene as Indeterminate.
3. IF the VCF REF at a defining position differs from the definition's reference
   THEN THE system SHALL return that gene as Indeterminate.
4. IF a defining position appears in more than one VCF record THEN THE system
   SHALL return that gene as Indeterminate.
5. IF an observed letter at a defining position is neither the definition's
   reference nor one of its alternates THEN THE system SHALL return that gene as
   Indeterminate.
6. THE system SHALL read defining positions, letters, and allele names only from
   `data/allele-definitions.json`.

### Requirement 4: Matching named alleles

**User story:** As the engine, I want each copy matched to a named allele, so
that the diplotype reflects PharmCAT's definitions.

#### Acceptance criteria

1. THE system SHALL treat a blank (`null`) letter in a named allele as the
   reference letter, and an IUPAC code or "X or Y" entry as the set of letters it
   stands for.
2. WHEN both copies match named alleles at every defining position THE system
   SHALL return the diplotype of those two alleles (e.g. `*2/*2` when both copies
   match `*2`, `*1/*3` when they differ).
3. WHEN more than one named allele matches the same copy THE system SHALL choose
   the one that defines the most positions with a single letter.
4. IF a copy matches no named allele THEN THE system SHALL return the gene as
   Indeterminate, so an unknown variant is never reported as normal.
5. IF two or more different diplotypes remain equally good after rules 3 and
   Requirement 5 THEN THE system SHALL return the gene as Indeterminate and name
   the candidates in the note.

### Requirement 5: Phase

**User story:** As a clinician, I want to know when a call depends on an assumed
phase, so that I can order confirmatory testing.

#### Acceptance criteria

1. WHEN all heterozygous positions of a gene are phased (`|`) THE system SHALL use
   the given phase only.
2. WHEN a gene has two or more unphased heterozygous positions THE system SHALL
   consider every arrangement of them across the two copies.
3. WHEN more than one arrangement matches named alleles THE system SHALL prefer an
   arrangement that places the heterozygous variants in trans (on different
   copies).
4. WHEN the chosen call places unphased heterozygous variants on both copies, or
   another arrangement also matched, THE system SHALL set `ambiguous: true` and
   name the other matching diplotypes, if any, in the note.
5. IF a gene has more than 10 unphased heterozygous positions THEN THE system
   SHALL return it as Indeterminate.

### Requirement 6: Diplotype to phenotype

**User story:** As the engine, I want CPIC's phenotype for each diplotype, so
that drug guidance keys off CPIC's own terms.

#### Acceptance criteria

1. WHEN a diplotype is called THE system SHALL look it up in
   `data/cpic-diplotype-phenotypes.json` in either allele order and return CPIC's
   phenotype term, and CPIC's activity score where CPIC gives one.
2. WHEN a diplotype is found THE system SHALL write it in CPIC's allele order.
3. IF a called diplotype is not in CPIC's table for a gene that has one THEN THE
   system SHALL return phenotype `Indeterminate` and keep the diplotype.
4. WHEN a gene has no CPIC phenotype table (VKORC1, CYP4F2) THE system SHALL return
   `phenotype: null` with a note that CPIC uses the genotype directly.
5. THE system SHALL NOT compute a phenotype or activity score by any rule other
   than the CPIC table lookup.

### Requirement 7: CYP2D6

#### Acceptance criteria

1. THE system SHALL return CYP2D6 as Indeterminate with the note "CYP2D6 cannot be
   determined from this file." for every `ParsedVcf`.

### Requirement 8: Pinned, repeatable reference data

**User story:** As a reviewer, I want the reference data traceable to a pinned
source, so that every call can be reproduced.

#### Acceptance criteria

1. THE fetch script SHALL download allele definitions from the PharmCAT `v3.4.0`
   tag and CPIC diplotypes from the CPIC API, and SHALL record source URLs,
   versions, and retrieval date in each output file.
2. IF any download fails or returns unexpected data THEN THE fetch script SHALL
   exit with an error and SHALL NOT write partial files.
3. THE app SHALL NOT fetch reference data at runtime.

### Requirement 9: Answer key

**User story:** As a judge, I want the calls checked against PharmCAT, so that the
caller is shown to be correct.

#### Acceptance criteria

1. WHEN `public/samples/maya.vcf` (PharmCAT Example 2) is processed THE system
   SHALL return, for each of the 8 VCF genes, the same diplotype, phenotype, and
   activity score as `data/samples/maya.phenotype.json`. Maya's CYP2C19 SHALL be
   `*2/*2`, Poor Metabolizer.
2. THE same SHALL hold for `alex.vcf` and `sam.vcf` against their
   `phenotype.json` files.

### Requirement 10: Property-based tests

#### Acceptance criteria

1. THE system SHALL hold the property that every generated genotype combination
   over the defining positions yields exactly one result per gene.
2. THE system SHALL hold the property that removing any defining position of a
   gene always makes that gene Indeterminate.
3. THE system SHALL hold the property that `callStarAlleles` never throws.
