---
inclusion: always
---

# Clinical safety rules (apply to every file)

## Patient-facing text
- NEVER tell a patient to take, stop, skip, switch, or change the dose of any medication.
- NEVER show dose numbers, mg amounts, or dosing frequencies on patient screens.
- Use exactly three result levels. Code identifiers are `AssessmentLevel` in `lib/pgx/types.ts`: `typical` ("Typical response expected"), `caution` ("Your genes may change how this drug works"), `warning` ("Talk to your prescriber before your next dose"). No patient screen renders a level yet.
- The strongest patient message is: "Talk to your prescriber or pharmacist before your next dose."
- Write at a 6th–8th grade reading level. Short sentences. No jargon without a plain explanation.
- Never convey a result by color alone; always pair it with an icon and words.

## Clinician-facing text
- Clinician screens may show CPIC recommendation wording, strength, and alternatives.
- Clinician screens are only reachable after the NPI gate.

## Data integrity
- Never invent clinical content. Every guidance row must come from a versioned source-linked file under `data/`, with CPIC guideline ID/version, recommendation ID, context, and PMID. The current curated file is `data/cpic-cyp2c19-clopidogrel.v1.json`; its wording is source-checked demo text awaiting qualified clinical review.
- If a gene has no data for this user, or cannot be determined (e.g. CYP2D6, which is not callable from a VCF), return "Indeterminate". Never guess a phenotype. A `DiplotypeCall.source` label alone does not prove validation; require complete build/coverage/quality checks before assessment.
- If a VCF lacks coverage at any defining position for a gene, return "Indeterminate" for that gene. Never assume reference.
- Reject VCFs that are not single-sample or not GRCh38 with a clear user-facing error. (Status: today the parser warns and the caller makes every gene Indeterminate; the upload UI still labels it "Warning". Open as `pgx-engine` task 3.)
- Phase from `|` is valid only within one phase set (`PS`). Heterozygous positions in different phase sets, or a phased file without trustworthy PS, must be treated as unphased relative to each other. Known defect: `parseVcf`/`callStarAlleles` ignore `PS` today (see `docs/STATUS_AUDIT_2026-10-24.md`).
- FILTER, QUAL, and genotype quality (`GQ`, `DP`) are evidence the caller must compute and check, not flags a caller passes in. Today the caller ignores them, so no uploaded VCF call is clinical-quality.
- openFDA adverse event data must always be shown with: "These are reports, not proof the drug caused the reaction."

## Privacy
- Genetic data is processed in the browser only. Never send genotype or raw file contents to any API route or external service.