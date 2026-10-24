# Clinical data and API change log

## 2026-10-24 — Kai's VCF input integrated with Edu's guidance branch

- Merged `feature/vcf-input` commit `bfdd24f` into `clinical-data`: browser-only `parseVcf`, the VCF upload component, three synthetic sample VCFs, PharmCAT 3.4.0 reference outputs, and parser tests. No source-backed CPIC row or API was changed.
- Reused `parseVcf` inside the existing VCF format inspector and retained the JSON/raw-TSV inspector as a separate path. The patient page now has one VCF chooser and a separate fictional phenotype guidance example; choosing a VCF does not produce a drug assessment.
- Reconciled shared types, steering, specs, README, and API/gap register. `callDiplotypes`, phenotype lookup, validated coverage and quality gate, and VCF-to-guidance testing remain open. The source snapshot remains `humanClinicalReview: false`.

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

## 2026-10-24 — Main VCF contract joined to phenotype-guidance layer

- Merged main's VCF/`DiplotypeCall` types and PGx-engine spec into `clinical-data`; left Kai's parser/caller implementation untouched. The committed `data/allele-definitions.json` still has TODO coordinates and cannot support real calls.
- Expanded the CYP2C19 + clopidogrel ACS/PCI demo snapshot from two to five source-linked phenotypes: Poor, Intermediate, Normal, Rapid, and Ultrarapid. New rows map to CPIC recommendation IDs 8480387, 8480384, and 8480383; every row remains `humanClinicalReview: false`. Refreshed the allowlisted patient snapshot (`r2`).
- Both assessment paths now accept exact `RxNorm:32968` or `clopidogrel` identity and reject self-reported `lab-report` calls even if a file claims completeness. No NDC/brand inference was added.
- Main had committed a raw CPIC candidate file. The merge kept it locally for validation but removed it from branch tracking; candidates remain ignored until reviewed for redistribution.
