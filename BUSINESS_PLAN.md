# Karyanomics — Business Plan

> **Know how your genes shape your medications, before your next dose.**

Karyanomics is an affordable pharmacogenomics (PGx) app. A patient loads their
genetic results, picks a medication, and gets a plain-language answer about
whether their genes may change how that drug works. Clinicians who verify their
NPI get the full clinical detail: diplotype, phenotype, and the CPIC
recommendation with its evidence.

Every figure in this plan is cited. See [`docs/MARKET_RESEARCH.md`](docs/MARKET_RESEARCH.md)
for the full source list.

---

## 1. The problem

The same prescription can work for one person, do nothing for another, and harm
a third — partly because of genes that control how the body metabolizes drugs.
The clinical guidelines for these gene–drug pairs already exist (CPIC), but the
tests are costly and the reports are hard to read. Most patients never see this
information.

- **~1.5M** U.S. emergency-department visits a year from adverse drug events;
  nearly **500,000** require hospitalization. *(CDC)*
- **~175,000** U.S. deaths in one year linked to drug reactions (1.25M serious
  events). *(FDA FAERS, via NIH/StatPearls)*
- **$30B+** a year in drug-related harm — extra care, disability, lost
  productivity; some models run far higher. *(NIH)*

## 2. Why now — the opportunity is universal

- **90%+** of people carry at least one actionable gene variant affecting a
  drug. *(Cell Reports Medicine, 2023)*
- **~45%** of patients are already prescribed at least one drug with a CPIC
  gene-based guideline. *(MDPI Pharmacy, 2025)*
- **~46%** of U.S. adults take a prescription drug; **~25%** take 3+. Among
  adults 65+, **1 in 3** take 5+ medications. *(CDC; NIH/NIA)*

This is not a niche — it is almost everyone who takes medication.

## 3. The evidence it works

- **PREPARE trial** (~7,000 patients, 7 European health systems): PGx-guided
  prescribing cut clinically relevant adverse drug reactions by **~30%**.
  *(Swen et al., The Lancet, 2023)*
- **Breakeven ~$114 per patient** for preemptive testing — below most test
  prices on sale today. *(The Pharmacogenomics Journal / Nature, 2018)*
- Preemptive panel testing is cost-effective or cost-saving for payers in
  cardiovascular care, depression, and ADR prevention. *(Genetics in Medicine
  2021; Pharmacogenomics J 2025)*

**Honest caveat (name it before an investor does):** a Lancet commentary noted
PREPARE's open-label design may inflate the self-reported 30% figure.

## 4. The market

- Global pharmacogenomics market **~$7.6B in 2024**, growing **~8%/yr** toward
  $12B+ by 2030. *(Grand View Research)*
- U.S. market **~$1.0B (2023) → ~$1.7B (2028)** at **~11%/yr**.
  *(MarketsandMarkets)*
- **70%+** of surveyed adults are willing to pay for genetic testing.
  *(MDPI J Pers Med; Frontiers in Genetics, 2022)*

Estimates vary widely by firm ($3.5B–$18B for 2024) because "pharmacogenomics"
is defined differently. **We cite a range, not a single number.**

## 5. Competition & our wedge

| Company | Self-pay price | What they sell |
|---|---|---|
| GeneSight (Myriad) | ~$330 | Psychiatric PGx lab panel |
| Tempus nP | ~$295 | Psychiatry/neuro PGx via exome |
| Genomind | ~$599 | At-home PGx panel |
| OneOme RightMed | doctor-ordered | Broad PGx panel |

*(Sources: Gene2Rx cost guide; company sites.)*

**Every competitor sells the lab test.** Karyanomics sells **the answer** —
plain-language for patients, full detail for clinicians — computed from a file
the patient already owns, with genetic data that **never leaves the device**.
That is the wedge no incumbent occupies.

## 6. The equity edge

- **78%** of genome-wide study participants are of European descent, though they
  are ~16% of the global population. *(Sirugo et al., Cell, 2019)*
- PGx allele frequencies differ significantly by ancestry, so panels built on
  European data can miss real variants in other groups. *(Clin Pharmacol Ther,
  2025)*

Building for all ancestries is both the right thing and a differentiator no
competitor owns.

## 7. Business model

1. **Free** — load genes, check one drug.
2. **Patient subscription** — all medications, saved summary cards.
3. **Clinician seats** — monthly fee per verified provider for full detail.
4. **Clinic & pharmacy deals** — integration contracts.

## 8. Risks

- **Reimbursement** is the weak link — Medicare does not cover some PGx tests
  (e.g. warfarin); coverage is piecemeal by gene–drug pair. *(CMS)*
- **Regulation** — FDA walls off direct-to-consumer genetic results from
  clinical action; we stay demo-and-clinician, never dosing advice. *(FDA)*
- **Evidence** — see the PREPARE open-label caveat above.

## 9. Roadmap

| Phase | Milestone |
|---|---|
| Now | Browser VCF parser, 8-gene caller, CYP2C19 + clopidogrel demo |
| Next | More gene–drug pairs, clinician portal, NDC barcode scan |
| Later | Real clinician identity verification, assay-quality checks |
| Goal | Clinic and pharmacy integration deals |

---

*Karyanomics is a hackathon prototype for education and demonstration only. It
is not a medical device and does not provide medical advice.*
