---
inclusion: fileMatch
fileMatchPattern: ["lib/pgx/**", "data/**", "scripts/**"]
---

# Data sources

- ClinPGx API: https://api.clinpgx.org/v1/ — max 2 requests/second, data is CC BY-SA 4.0. Use only in scripts at build time, never at runtime.
- Use CPIC standard phenotype terms (e.g. "Poor Metabolizer", "Decreased Function").
- PubMed links use the format https://pubmed.ncbi.nlm.nih.gov/<PMID>/

## VCF allele calling

- PharmCAT reference outputs in `data/samples/` are the answer key for the sample
  VCFs in `public/samples/`. Tests must check that `callDiplotypes` on
  `public/samples/maya.vcf` produces the same CYP2C19 diplotype and phenotype as
  `data/samples/maya.phenotype.json`.
- Sample provenance (answer keys generated with PharmCAT 3.4.0):
  - `maya.vcf`: PharmCAT example 2 VCF, unmodified (CYP2C19 *2/*2).
  - `alex.vcf`: PharmCAT example 1 VCF, unmodified (all reference).
  - `sam.vcf`: PharmCAT example 1 with GT set to 0/1 at rs1057910, rs4149056,
    rs9923231 (existing PharmCAT rows, no coordinates added).
- Never invent allele positions; read them from `data/allele-definitions.json`.
