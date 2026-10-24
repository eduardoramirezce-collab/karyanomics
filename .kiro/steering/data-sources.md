---
inclusion: fileMatch
fileMatchPattern: ["data/**/*", "lib/pgx/**/*", "scripts/**/*", "tests/**/*"]
---

# PGx data workflow

- Prefer official CPIC/ClinPGx APIs and downloads to scraping rendered pages. Keep API calls in build-time scripts, at no more than two requests per second.
- ClinPGx data are subject to its current data usage policy; do not assume a blanket CC BY-SA or CC0 license for every endpoint. Record the exact source and terms for each snapshot.
- A source refresh creates an ignored candidate file and never silently replaces the curated snapshot.
- Key guidance by gene, normalized drug identifier, phenotype, and clinical indication. A gene-drug pair alone is not enough.
- Preserve guideline ID, version, recommendation ID, retrieval date, strength, PMID, source URL, and review status.
- Distinguish a complete reference call from a missing position, no-call, unsupported allele, and unverified test report. None means normal.
- Never claim a normal metabolizer will respond well or that a drug is safe. PGx covers only specific genetic factors.
- Never use openFDA adverse-event counts, population allele frequencies, or NPI lookup to infer an individual's medication response.
- CYP2D6 and HLA calls need specialized methods; do not infer them from a few VCF SNPs.
- PubMed citation URLs use `https://pubmed.ncbi.nlm.nih.gov/<PMID>/`.
- Clinical text remains `humanClinicalReview: false` until a qualified reviewer checks wording and population match.

## VCF-to-phenotype handoff (Kai)

- `data/allele-definitions.json` currently contains TODO placeholders, not usable allele coordinates. Never use them for a real call.
- Missing required reference/no-call positions, unknown GRCh38 status, phase ambiguity, or unsupported allele calls resolve to `Indeterminate`. Never assume variants in trans or infer `*1` from a variant-only VCF.
- The phenotype-to-guidance side consumes a `DiplotypeCall[]` only when the caller's coverage and quality checks are complete.
- PharmCAT reference outputs in `data/samples/` are the answer key for sample VCFs in `public/samples/`. Once the caller exists, tests must compare CYP2C19 calls and phenotype with those outputs before guidance is connected.
- Sample provenance (answer keys generated with PharmCAT 3.4.0):
  - `maya.vcf`: PharmCAT example 2 VCF, unmodified (CYP2C19 *2/*2).
  - `alex.vcf`: PharmCAT example 1 VCF, unmodified (all reference).
  - `sam.vcf`: PharmCAT example 1 with GT set to 0/1 at rs1057910, rs4149056,
    rs9923231 (existing PharmCAT rows, no coordinates added).
- Never invent allele positions; read them from `data/allele-definitions.json`.
