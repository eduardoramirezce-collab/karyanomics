# Current gaps and next implementation order

As of 2026-10-24, the browser intake and CPIC demo lookup are working, but the project is **not a clinical interpretation service**.

1. **Real test result verification:** there is no lab identity check, assay quality/coverage validation, reference-call proof, or signed report. Self-declared JSON values remain `review_required` and never automatically reach `assess()`.
2. **Validated allele/phenotype caller:** raw SNP files and VCF are only structurally parsed. A GRCh38 VCF needs all PharmCAT-required positions including explicit reference/no-calls, validated quality and phasing rules, a pinned PharmCAT release, and specialized outside calls for CYP2D6/HLA. No gene phenotype is inferred today.
3. **Clinical scope/review:** only CYP2C19 + clopidogrel in ACS/PCI has five demo rows (Poor, Intermediate, Normal, Rapid, Ultrarapid Metabolizer). Other phenotypes, indications, genes and drugs are unsupported. The wording and source usage terms need qualified review. A normal result does not prove efficacy or safety.
4. **Drug identity:** the lookup accepts exact `RxNorm:32968`, but no RxNorm/RxNav normalizer or openFDA NDC route exists. Typed drug names and NDCs cannot yet be safely joined to CPIC's RxNorm ID.
5. **Clinician access and presentation:** no clinician portal, NPI lookup or real authentication exists. NPI alone would be demo access only. Full CPIC recommendation text is not exposed on the patient page.
6. **Source operations:** the CPIC candidate fetch is manual. No scheduled refresh, provenance diff UI, source-change alert, or multi-guideline data schema yet. The current candidate validator checks selected fields but not every clinical qualifier or terms change.
7. **Privacy/security:** browser-only local parsing avoids upload but does not establish production privacy compliance, threat modeling, consent, retention policy, accessibility audit, or lab/system integration.
8. **Evidence boundaries:** openFDA adverse events, PharmVar allele definitions, FDA labeling, CDC GeT-RM and population datasets are documented research inputs only. They cannot be treated as independent patient-response recommendations.

Suggested next increment: choose one real laboratory export format, create a de-identified fixture and field mapping, validate its provenance/coverage, then wire a clinician-reviewed phenotype into the existing CPIC lookup. In parallel, add RxNorm normalization and a clinician detail screen with real access controls before widening the source snapshot.
