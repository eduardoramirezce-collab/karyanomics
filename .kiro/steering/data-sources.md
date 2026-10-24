---
inclusion: fileMatch
fileMatchPattern: ["lib/pgx/**", "data/**", "scripts/**"]
---

# Data sources

- ClinPGx API: https://api.clinpgx.org/v1/ — max 2 requests/second, data is CC BY-SA 4.0. Use only in scripts at build time, never at runtime.
- Use CPIC standard phenotype terms (e.g. "Poor Metabolizer", "Decreased Function").
- PubMed links use the format https://pubmed.ncbi.nlm.nih.gov/<PMID>/
