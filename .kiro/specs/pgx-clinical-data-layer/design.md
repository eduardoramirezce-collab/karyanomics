# Design — PGx clinical data layer

## Overview

The clinical data layer is a client-side, pure-function engine plus a reviewed,
versioned data file. There is no server component for genetic assessment: a
phenotype goes in, a source-backed result comes out, all in the browser.

```
app/ (patient UI)
  └─ lib/pgx/assess.ts   assess(input, data) -> AssessmentResult   (pure)
        reads
          data/cpic-cyp2c19-clopidogrel.v1.json   (reviewed, versioned, cited)
        types from
          lib/pgx/types.ts   (shared with frontend)
```

External APIs (openFDA, NPPES) are used elsewhere in the app via server routes,
never in the genetic assessment path, and never to generate a recommendation.

## Components

### Data file: `data/cpic-cyp2c19-clopidogrel.v1.json`

A reviewed projection of the CPIC CYP2C19/clopidogrel guideline. Shape:

- `dataVersion`, `retrievedAt`, `source` (name, url, guidelineId, publication,
  cpicVersion, license)
- `pairs[]`: each with `gene`, `drug`, `rxnormId`, and `recommendations[]`
- each recommendation: `phenotype`, `indication`, `strength`,
  `recommendation`, `implications`, `comments`, `needsHumanReview`

The snapshot contains short, source-backed demo explanations keyed to CPIC
recommendation IDs. These paraphrases are explicitly marked as not yet
clinically reviewed. A refresh creates an ignored candidate file; it does not
replace this snapshot automatically.

### Types: `lib/pgx/types.ts`

See the shared-types section. Discriminated union on `status` so the UI can
switch on `matched` / `indeterminate` / `insufficient_data`.

### Engine: `lib/pgx/assess.ts`

Pure function. Steps:

1. If phenotype is `Indeterminate` → `indeterminate`.
2. Find the gene–drug pair; if none → `insufficient_data` (`unsupported_pair`).
3. Find a recommendation matching phenotype + indication; if none →
   `insufficient_data` (`no_match_for_indication` or `unsupported_phenotype`).
4. Otherwise → `matched` with the recommendation and source provenance.

The function never returns a dose and never calls the network.

## Identifier map (how sources connect)

- Gene symbol (`CYP2C19`) and phenotype term are the CPIC/PharmCAT vocabulary.
- Drug name (`clopidogrel`) ↔ `RxNorm:32968` (CPIC) ↔ openFDA
  `openfda.rxcui` / `generic_name` (display/NDC only, not recommendation).
- Clinician identity: NPI ↔ NPPES (access gate only, never recommendation).

## Error handling

Every non-matched outcome carries a machine-readable `reason`. Missing or
ambiguous input resolves to indeterminate/insufficient, never to a normal
default.

## Testing strategy

Vitest unit tests on `assess()`:

- Maya CYP2C19 Poor Metabolizer + clopidogrel + ACS/PCI → matched, Strong,
  source present, no dose string.
- CYP2C19 Normal Metabolizer + clopidogrel + ACS/PCI → matched (different text).
- CYP2C19 Indeterminate → indeterminate.
- Unsupported drug → insufficient_data.
- Supported pair, unmatched indication → insufficient_data (no substitution).
- Provenance: matched result's source url/version equals the data file's source.
