# Clinical data and API change log

## 2026-10-24 — Browser intake and source register

- Merged latest `main` steering commits (`69fbec6`, `649993e`) into `clinical-data`; reconciled conflicting source-policy guidance.
- Added browser-only PGx file intake and structural categorization for structured report JSON, VCF, and four-column consumer raw text. No uploaded file is sent to an API or converted directly into a clinical recommendation.
- Added a fictional JSON fixture, parser tests, patient intake page, and a source-backed Maya demo view. The patient page imports a separate allowlisted snapshot so clinician-only wording is absent from its module data.
- Added [`API_AND_UPLOAD_REGISTER.md`](./API_AND_UPLOAD_REGISTER.md) with current/planned API status and the upload contract.
- Source data unchanged: CPIC guideline PA166251443 v71, two ACS/PCI demo rows, both `humanClinicalReview: false`.
- Refreshed the ignored official CPIC candidate on 2026-10-24: guideline version 71 and 24 recommendation rows; the validator still matched the two curated demo rows. No candidate was promoted.

## 2026-10-24 — First CPIC snapshot workflow

- Added CPIC API candidate fetch (`guideline`, `pair_view`, `recommendation_view`), a curated CYP2C19/clopidogrel demo snapshot, provenance validator, and pure `assess()` lookup.
- Added source inventory and PGx research pipeline. Candidate downloads remain ignored until human review.

This log records repository data-workflow changes. Git history is the authoritative file-by-file audit; source refreshes must retain retrieval timestamps and IDs.
