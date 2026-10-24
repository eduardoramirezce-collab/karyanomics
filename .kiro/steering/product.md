# Product

Karyanomics is an affordable pharmacogenomics (PGx) web app. Patients load their
genetic results, scan or search a medication, and get a plain-language answer
about whether their genes may change how that drug works for them. Clinicians who
verify their NPI see the full detail: diplotype, phenotype, and the CPIC
recommendation with its evidence.

Built at Hackachusetts 2026 (Healthcare & Biotech track). It is a prototype for
education and demonstration only — not a medical device, not medical advice.

## Two audiences

- **Patient side:** load a genotype (demo persona or 23andMe-style raw file,
  parsed in-browser and never uploaded), scan an NDC barcode or search a drug,
  and get one of three outcome levels (`typical` ✅, `caution` ⚠️, `warning` 🛑)
  with a short explanation and its cited guideline.
- **Clinician side:** gated behind an NPI check (check-digit + CMS NPPES lookup;
  demo access only, not real auth). Shows gene, diplotype, phenotype, CPIC
  recommendation, strength, alternatives, and PubMed citations.

## Core safety rule (non-negotiable)

Patient-facing text must **never** instruct someone to start, stop, or change a
dose — that decision belongs to a clinician. Every recommendation must cite its
source. When a result cannot be reliably determined (e.g. CYP2D6 from consumer
arrays), show it as `Indeterminate` rather than guessing.

## Scope

CPIC level A gene-drug pairs only: CYP2C19, CYP2D6, CYP2C9+VKORC1, SLCO1B1,
TPMT/NUDT15, DPYD. Genetic data stays on the device; no real patient data is
stored in the repo.
