# Design — PGx engine (VCF pipeline)

## Overview

The PGx engine is a client-side, pure-function pipeline plus reviewed, versioned
data files. A VCF goes in; a source-backed result comes out; all in the browser.
There is no server component in the genetic path.

```
app/ (patient UI)
  └─ lib/pgx/
       parseVcf(text)            -> ParsedVcf             (pure)
       callDiplotypes(vars, defs) -> DiplotypeCall[]       (pure)
         (+ optional CYP2D6 outside call joins here)
       phenotype lookup           -> DiplotypeCall.phenotype
       assess(phenotype, drug, indication) -> AssessmentResult (pure)
         reads
           data/allele-definitions.json       (allele defining positions)
           data/cpic-*.v1.json                 (reviewed, versioned, cited)
           public/samples/*.vcf + data/samples/*.phenotype.json (answer key)
         types from
           lib/pgx/types.ts
```

External APIs (openFDA, NPPES) are used elsewhere in the app via server routes,
never in the genetic path, and never to generate a recommendation.

## Components

### `parseVcf(text: string): ParsedVcf`

Reads a VCF's text. Ignores `##` meta lines and the `#CHROM` header. For each
data line, extracts `CHROM`, `POS`, `REF`, `ALT` (split on `,`), and the single
sample's `GT` from the `FORMAT`/sample columns. Determines `phased` from the `|`
vs `/` separator and parses allele indices into `gt`. Malformed lines are skipped
with their line number recorded; the function never throws on input content.

The parser reports build and sample warnings; the blocking eligibility gate is
still to be implemented before any allele call or guidance. Parsed variants
alone are never considered verified clinical calls.

### `callDiplotypes(variants: VcfVariant[], defs: AlleleDefinition[]): DiplotypeCall[]`

For each gene in the definitions, checks whether the defining positions are
covered by the parsed variants. If a defining position is missing, the gene is
`Indeterminate` (never assume reference). Otherwise it matches variants to star
alleles per chromosome and emits a `DiplotypeCall` with `source: "vcf"`.

CYP2D6 is never produced here from the VCF. The optional outside call is merged
in as a `DiplotypeCall` with `source: "outside-call"`; absent, CYP2D6 is
`Indeterminate` with the fixed explanation.

### Phenotype lookup

Maps a called diplotype to a CPIC standard phenotype term. No mapping →
`Indeterminate`.

### `assess(phenotype, drug, indication): AssessmentResult`

Pure function. Steps:

1. If phenotype is `Indeterminate` → `indeterminate`.
2. Find the gene–drug pair; if none → `insufficient_data` (`unsupported_pair`).
3. Find a recommendation matching phenotype + indication; if none →
   `insufficient_data` (`no_match_for_indication` or `unsupported_phenotype`).
4. Otherwise → `matched` with the recommendation and source provenance.

Never returns a dose; never calls the network.

### Data files

- `data/allele-definitions.json`: star-allele defining positions per gene
  (CYP2C19, CYP2C9, VKORC1, SLCO1B1, TPMT). Positions sourced from
  ClinPGx/PharmCAT, never invented. Currently placeholder (`TODO`) coordinates.
- `data/cpic-cyp2c19-clopidogrel.v1.json`: source-linked CPIC demo rows;
  `humanClinicalReview: false` pending qualified clinical review.
- `public/samples/maya.vcf` + `data/samples/maya.phenotype.json`: a synthetic
  sample patient and its PharmCAT reference output (the answer key).

## Identifier map (how sources connect)

- Gene symbol (`CYP2C19`) and phenotype term are the CPIC/PharmCAT vocabulary.
- VCF positions ↔ allele definitions ↔ star alleles (PharmCAT/PharmVar).
- Drug name (`clopidogrel`) ↔ openFDA (display/NDC only, not recommendation).
- Clinician identity: NPI ↔ NPPES (access gate only, never recommendation).

## Error handling

Every non-matched outcome carries a machine-readable reason. Missing or ambiguous
input resolves to Indeterminate/insufficient, never to a reference default.
Non-single-sample or non-GRCh38 VCFs are rejected at the boundary.

## Testing strategy

Vitest unit tests:

- `parseVcf`: well-formed line → correct `VcfVariant`; malformed line skipped with
  line number; `|` vs `/` sets `phased`.
- `callDiplotypes`: homozygous match → `*2/*2`; heterozygous → `*1/*2`; missing
  defining position → Indeterminate (no reference assumption).
- CYP2D6: no outside call → Indeterminate with the fixed explanation; outside call
  → used with `source: "outside-call"`.
- End-to-end: `maya.vcf` → CYP2C19 `*2/*2`, Poor Metabolizer, equal to
  `maya.phenotype.json`; then assessed against clopidogrel/ACS-PCI → matched,
  source present, no dose string.
- `assess`: Indeterminate → indeterminate; unsupported drug → insufficient_data;
  supported pair, unmatched indication → insufficient_data (no substitution).

fast-check property tests:

- `parseVcf` never throws on any generated VCF text.
- A VCF with no variant calls yields only reference or Indeterminate results.
- Patient-facing text never contains stop/take/dose instructions.
