---
inclusion: fileMatch
fileMatchPattern: ["lib/pgx/**", "data/**", "scripts/**"]
---

# Data sources

- ClinPGx API: https://api.clinpgx.org/v1/ — max 2 requests/second, data is CC BY-SA 4.0. Use only in scripts at build time, never at runtime.
- Use CPIC standard phenotype terms (e.g. "Poor Metabolizer", "Decreased Function").
- PubMed links use the format https://pubmed.ncbi.nlm.nih.gov/<PMID>/

## VCF allele calling

- PharmCAT example files in `data/samples/` are the answer key. Tests must check
  that `callDiplotypes` on `maya.vcf` produces the same CYP2C19 diplotype and
  phenotype as `maya.phenotype.json`.
- Never invent allele positions; read them from `data/allele-definitions.json`.
