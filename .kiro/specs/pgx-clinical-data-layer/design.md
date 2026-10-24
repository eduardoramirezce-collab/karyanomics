# Design — PGx clinical data layer

## Overview

The clinical data layer is client-side pure functions over versioned source
snapshots. There is no server component for genetic assessment. A phenotype
and drug can first identify a CPIC source row for clinician review; only a
separately reviewed snapshot can produce patient wording.

```
trusted caller evidence (pending) → DiplotypeCall[] + per-gene evidence
  ├─ research-recommendation-route.ts → exact CPIC row ID for review only
  │    reads data/cpic-recommendation-routes.v1.json
  └─ assess.ts → CYP2C19/clopidogrel ACS/PCI synthetic demo only
       reads data/cpic-cyp2c19-clopidogrel.v1.json
```

External APIs (openFDA, NPPES) are used elsewhere in the app via server routes,
never in the genetic assessment path, and never to generate a recommendation.

## Components

### Data file: `data/cpic-cyp2c19-clopidogrel.v1.json`

A source-checked demo projection of the CPIC CYP2C19/clopidogrel guideline,
**not yet clinically reviewed**. Actual shape:

- `schemaVersion`, `snapshotId`, `retrievedAt`, `reviewStatus`, `source`
- `pair` with `gene`, `drug`, `rxnormId`, and CPIC level
- `records[]` with phenotype, ACS/PCI context, recommendation ID, strength,
  source-linked demo paraphrases, and `humanClinicalReview: false`

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

### Research source router: `research-recommendation-route.ts`

`data/cpic-recommendation-routes.v1.json` pins CPIC guideline versions and 134
exact lookup-key rows for clopidogrel, thiopurines and statins. The router
requires exact drug/RxNorm identity, population, all required gene calls,
complete GRCh38/quality evidence and activity score when the source key uses
one. It checks phenotype and activity score against the same source row.
Warfarin returns `guideline_algorithm_required`: the CPIC API says it does not
follow simple diplotype-to-phenotype translation. The router returns only row
ID, classification and provenance, never a prescribing instruction or dose.
Caller evidence is a **trusted handoff contract**, not something upload JSON
can self-assert. See `docs/PHENOTYPE_TO_GUIDANCE_RESEARCH.md`.

### Medication browse taxonomy: `drug-therapeutic-groups.ts`

`data/drug-therapeutic-groups.v1.json` assigns each of the ten indexed CPIC
guideline families to one of nine team-selected therapeutic areas and a more
specific medication family. The pure function deduplicates 41 gene–drug pairs
into 34 exact-RxNorm ingredients and collects their indexed target genes. The
`/drugs` page shows the nine areas and CPIC links; empty groups stay empty. This
is an editorial navigation index. It neither consumes a genotype nor assigns
a patient-response category, drug suitability, indication, or dose. Some source
guidelines require genes outside the eight target genes.

`data/rxnorm-drug-names.v1.json` adds an independently versioned NLM
Prescribable RxNorm display-name layer. It keys each generic to the exact CPIC
ingredient RxNorm ID, and each current U.S. brand to BN and supporting
single-ingredient SBD IDs. The browse function joins by ingredient ID and
fails if an indexed generic is missing. `findDrugDisplayMatches()` returns
catalog entries for exact aliases only; it is never passed to the clinical
router. The patient page cites NLM and does not imply a brand or product is
appropriate for a person's genotype.

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

Routing tests separately cover TPMT+NUDT15, statin multi-gene and CYP2C9
activity-score keys, caller-evidence failure, indication mismatch, warfarin's
algorithm boundary, and PharmCAT sample report vocabulary. The fixture tests
do not claim the app called those phenotypes from a VCF.
