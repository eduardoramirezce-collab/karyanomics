---
inclusion: fileMatch
fileMatchPattern: ["data/**/*", "lib/pgx/**/*", "scripts/**/*", "tests/**/*"]
---

# PGx data workflow

- Prefer the official CPIC API and ClinPGx downloads to scraping rendered pages.
- A source refresh creates an ignored candidate file. It must never silently
  replace the reviewed snapshot bundled into the app.
- Key a recommendation by gene, normalized drug identifier, phenotype, and
  clinical indication. A gene-drug pair alone is not enough.
- Preserve guideline ID, version, recommendation ID, retrieval date, strength,
  PMID, source URL, and review status. Validate these before release.
- Distinguish a complete reference call from a missing position, no-call,
  unsupported allele, and unverified test report. None means normal.
- Do not claim that a normal metabolizer will respond well, or that a drug is
  safe. PGx covers only specific genetic factors.
- Never use openFDA adverse-event counts, population allele frequencies, or an
  NPI lookup to infer an individual's medication response.
- CYP2D6 and HLA calls need specialized methods; do not infer them from a few
  consumer-array SNPs.
- Clinical text derived for the demo remains `humanClinicalReview: false`
  until a qualified reviewer checks the wording and population match.
