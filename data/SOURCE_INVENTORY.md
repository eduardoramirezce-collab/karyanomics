# Source inventory

This inventory lists every external data source the app touches, what it
provides, how identifiers connect across sources, and — critically — **which
sources may support a PGx recommendation**. It is the reference for reviewers.

Retrieved and verified: 2026-10-24.

## Rule: only CPIC/ClinPGx content may back a PGx recommendation

| Source | May back a PGx recommendation? |
| --- | --- |
| ClinPGx / CPIC | ✅ Yes — the sole source of recommendation wording and strength |
| PharmCAT examples | ⚠️ Input shape only — supplies example phenotype results, not recommendations |
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
- **License:** CPIC curated content is released under **CC0 1.0** (public
  domain dedication) — see https://cpicpgx.org/license/. NOTE: this corrects the
  README's "CC BY-SA 4.0" note, which applies to ClinPGx/PharmGKB aggregate
  data, not to CPIC's own curated recommendation text used here. **Flagged for
  human review**: confirm the license line in the README before submission.

## 2. PharmCAT examples

- **Provides:** example input shape — per-gene objects with a star-allele
  diplotype and a derived phenotype (e.g. `CYP2C19 *2/*2` → Poor Metabolizer).
- **Identifiers:** gene symbol, star alleles, phenotype term. These phenotype
  terms match the CPIC vocabulary, which is what lets a PharmCAT result be
  matched against CPIC recommendations.
- **Source:** https://pharmcat.clinpgx.org/examples/
- **Use here:** defines the `PhenotypeInput` contract only. We do **not** import
  PharmCAT recommendation output; recommendations come from CPIC.

## 3. openFDA

- **Provides:** NDC directory (barcode/NDC → `generic_name`) and drug
  adverse-event reports.
- **Identifiers:** `product_ndc`, `openfda.generic_name`, `openfda.rxcui`
  (RxNorm, which links to the CPIC drug id).
- **API:** `https://api.fda.gov/drug/ndc.json`, `https://api.fda.gov/drug/event.json`
- **License/terms:** U.S. FDA public data. A report is not proof of causation.
- **Use here:** drug display and NDC scanning only. Never a recommendation.

## 4. CMS NPPES NPI Registry

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

Only the top path (PharmCAT phenotype → CPIC recommendation) produces clinical
guidance. The openFDA and NPPES links are for drug display and clinician access
respectively.

## Items flagged for human review

- **README license line** vs CPIC CC0 (see section 1).
- Any gene–drug pair added later must have its source URL + guideline version
  verified against the CPIC API before it is marked reviewed (not
  `needsHumanReview`).
