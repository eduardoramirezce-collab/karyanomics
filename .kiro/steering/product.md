# Product

Karyanomics is an affordable pharmacogenomics (PGx) web app. Patients load their
genetic results, scan or search a medication, and get a plain-language answer
about whether their genes may change how that drug works for them. Clinicians who
verify their NPI see the full detail: diplotype, phenotype, and the CPIC
recommendation with its evidence.

Built at Hackachusetts 2026 (Healthcare & Biotech track). It is a prototype for
education and demonstration only — not a medical device, not medical advice.

## Two audiences

- **Patient side:** load a genotype by uploading a VCF file or loading one of
  three sample patients (parsed in-browser and never uploaded), scan an NDC
  barcode or search a drug, and get one of three outcome levels (`typical` ✅,
  `caution` ⚠️, `warning` 🛑) with a short explanation and its cited guideline.
- **Clinician side:** gated behind an NPI check (check-digit + CMS NPPES lookup;
  demo access only, not real auth). Shows gene, diplotype, phenotype, CPIC
  recommendation, strength, alternatives, and PubMed citations.

## Pipeline (how a result is produced)

Everything is computed from a genotype file — no hand-made phenotypes:

1. **Input:** a single-sample GRCh38 VCF (user upload or a bundled sample),
   plus an optional "outside call" input for CYP2D6.
2. **Parse VCF:** read `CHROM`, `POS`, `REF`, `ALT`, and the sample's `GT`
   field (phased `|` or unphased `/`).
3. **Call star alleles:** match variants at defined positions to star alleles
   and produce a diplotype per gene (e.g. CYP2C19 `*2/*2`).
4. **Diplotype → phenotype** using CPIC tables (e.g. Poor Metabolizer).
5. **Phenotype + drug → CPIC recommendation.**
6. **Report:** patient view (plain language) and clinician view (behind NPI gate).

## Core safety rule (non-negotiable)

Patient-facing text must **never** instruct someone to start, stop, or change a
dose — that decision belongs to a clinician. Every recommendation must cite its
source. When a result cannot be reliably determined, show it as `Indeterminate`
rather than guessing.

## Scope

Genes called from VCF: **CYP2C19, CYP2C9, VKORC1, CYP4F2, SLCO1B1, ABCG2, TPMT,
NUDT15.**

Gene-drug coverage (CPIC level A):

- CYP2C19: clopidogrel, citalopram, escitalopram, sertraline, omeprazole
- CYP2C9 + VKORC1 + CYP4F2: warfarin
- SLCO1B1: simvastatin
- SLCO1B1 + ABCG2: rosuvastatin
- TPMT + NUDT15: azathioprine, mercaptopurine
- CYP2D6 (outside call only): codeine, tramadol, ondansetron

When a CPIC guideline uses several genes for one drug (warfarin, rosuvastatin,
thiopurines), the result must use all of them. If any of those genes is
`Indeterminate`, do not present a result from the remaining genes as complete.

**CYP2D6 is not callable from a VCF.** It comes only from an optional
outside-call input; if absent, CYP2D6 is `Indeterminate` with the explanation
"CYP2D6 cannot be determined from this file." Other genes PharmCAT reports
(e.g. DPYD, G6PD, RYR1, CFTR) are out of scope today.

Genetic data stays on the device and is never sent to any server route; no real
patient data is stored in the repo.
