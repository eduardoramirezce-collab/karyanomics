# Source inventory

This inventory lists every external data source the app touches, what it
provides, how identifiers connect across sources, and — critically — **which
sources may support a PGx recommendation**. It is the reference for reviewers.

Retrieved and verified: 2026-10-24.

## Rule: only a specific, reviewed prescribing guideline may back an action

| Source | May back a PGx recommendation? |
| --- | --- |
| CPIC guidelines via ClinPGx | ✅ Yes, for the exact gene, drug, phenotype, and indication |
| PharmCAT examples | ⚠️ Test fixtures for phenotype and report matching, not a second independent evidence source |
| openFDA | ❌ No — drug identity (NDC) and adverse-event reports only |
| NPPES | ❌ No — clinician identity (NPI) only |

openFDA adverse-event reports are observational and are **not** proof a drug
caused an event. NPI/openFDA data must never be turned into clinical advice.

## 1. ClinPGx / CPIC

- **Provides:** gene–drug pairs, phenotype-based recommendation text,
  recommendation strength (Strong/Moderate/No Recommendation), implications,
  and comments (which carry the clinical context/indication).
- **Identifiers:** gene symbol (`CYP2C19`), drug `RxNorm` id
  (clopidogrel = `RxNorm:32968`), guideline id (`PA166251443`), guideline
  `version` (currently **71**), PubMed id for the publication (`PMID:35034351`,
  2022 update).
- **API:** `https://api.cpicpgx.org/v1/` (PostgREST). Guideline page:
  `https://www.clinpgx.org/guideline/PA166251443`.
- **Usage terms:** The former CPIC license URL now redirects to the ClinPGx data
  usage policy. The current API also points to that policy. Do **not** assume
  CPIC API output is CC0 without confirming the applicable terms. Keep data
  attribution and confirm the exact license before public redistribution.
- **Research recommendation routing:** `data/cpic-recommendation-routes.v1.json`
  pins 134 exact lookup keys and source IDs across clopidogrel, thiopurines and
  statins, with guideline versions and population terms. It includes no
  prescribing text or doses. Warfarin is indexed as algorithm-required, not a
  phenotype lookup. These rows are not qualified clinical guidance.

## 2. PharmCAT examples

- **Provides:** example input shape — per-gene objects with a star-allele
  diplotype and a derived phenotype (e.g. `CYP2C19 *2/*2` → Poor Metabolizer).
- **Identifiers:** gene symbol, star alleles, phenotype term. These phenotype
  terms match the CPIC vocabulary, which is what lets a PharmCAT result be
  matched against CPIC recommendations.
- **Source:** https://pharmcat.clinpgx.org/examples/
- **Current use:** three sample VCFs in `public/samples/` and PharmCAT 3.4.0
  answer keys in `data/samples/` are regression fixtures for a future caller.
  The parser does not yet compare calls to these outputs. PharmCAT is **not
  integrated as a caller**, and its reports are not independent corroboration
  of the CPIC recommendation they display.
- **Eight-gene research index:** `data/target-genes.v1.json` fixes the agreed
  scope. `data/cpic-gene-drug-catalog.v1.json` links those genes and synthetic
  sample calls to 41 non-provisional CPIC A/B pair records. It is discovery
  metadata only; it does not map a phenotype to an action.

## 3. openFDA (planned; no app route yet)

- **Provides:** NDC directory (barcode/NDC → `generic_name`) and drug
  adverse-event reports.
- **Identifiers:** `product_ndc`, `openfda.generic_name`, `openfda.rxcui`
  (RxNorm, which links to the CPIC drug id).
- **API:** `https://api.fda.gov/drug/ndc.json`, `https://api.fda.gov/drug/event.json`
- **License/terms:** U.S. FDA public data. A report is not proof of causation.
- **Use here:** drug display and NDC scanning only. Never a recommendation.

## 4. CMS NPPES NPI Registry (planned; no app route yet)

- **Provides:** clinician name, taxonomy/specialty, practice address for a given
  NPI.
- **Identifiers:** `number` (the 10-digit NPI, Luhn check-digit validated).
- **API:** `https://npiregistry.cms.hhs.gov/api/?version=2.1`
- **License/terms:** U.S. CMS public FOIA data. NPIs are public, so this is a
  demo access check, not real authentication.
- **Use here:** clinician-portal access gate only. Never a recommendation.

## How identifiers connect

```
PharmCAT result   CPIC recommendation        openFDA              NPPES
  gene  ─────────────► gene                     │                   │
  phenotype ──────────► phenotype               │                   │
                        drug RxNorm:32968 ◄────► openfda.rxcui       │
                        (PMID, guideline ver.)   product_ndc         │
                                                 generic_name        NPI number
```

Only the top path (a validated phenotype → matching CPIC recommendation) is
eligible to produce clinical guidance. The VCF-to-phenotype caller is not yet
implemented. The openFDA and NPPES links are for drug display and clinician
access respectively.

## Items flagged for human review

- **README license line** and CPIC API redistribution terms (see section 1).
- Any gene–drug pair added later must have its source URL + guideline version
  verified against the CPIC API before it is marked reviewed (not
  `needsHumanReview`).
