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

Target pipeline: a validated call will ultimately be computed from a genotype file. Today the VCF caller is not implemented, and the guidance demo uses a clearly labeled synthetic phenotype:

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

Planned VCF gene coverage: **CYP2C19, CYP2C9, VKORC1, SLCO1B1, TPMT.** The current guidance snapshot covers only CYP2C19 + clopidogrel for ACS/PCI.

**CYP2D6 is not callable from a VCF.** It comes only from an optional
outside-call input; if absent, CYP2D6 is `Indeterminate` with the explanation
"CYP2D6 cannot be determined from this file." DPYD and NUDT15 are out of scope
for VCF calling today (azathioprine and mercaptopurine remain covered under
TPMT).

Genetic data stays on the device and is never sent to any server route; no real
patient data is stored in the repo.

## Branch ownership

- Kai: VCF input → validated diplotype/phenotype. Owns parser, allele definitions, caller, and reference fixtures.
- Edu: validated phenotype + exact drug identity + indication → CPIC-linked guidance. Owns the curated recommendation snapshot, `assess`, patient-safe projection, source validation, and clinical-data docs.
- Shared contract: `DiplotypeCall[]` in `lib/pgx/types.ts`; a call is eligible for guidance only after the caller confirms build, coverage, quality, and ambiguity. Source label alone is not verification.
- Shared README/steering/spec changes should go through review into `main` so both branches inherit the same direction.
