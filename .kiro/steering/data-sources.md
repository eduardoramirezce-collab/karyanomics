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
- Consumer-array text and VCF uploads require preflight checks; they do not directly establish a star-allele diplotype or clinical phenotype.
- Never claim a normal metabolizer will respond well or that a drug is safe. PGx covers only specific genetic factors.
- Never use openFDA adverse-event counts, population allele frequencies, or NPI lookup to infer an individual's medication response.
- CYP2D6 and HLA calls need specialized methods; do not infer them from a few consumer-array SNPs.
- PubMed citation URLs use `https://pubmed.ncbi.nlm.nih.gov/<PMID>/`.
- Clinical text remains `humanClinicalReview: false` until a qualified reviewer checks wording and population match.
