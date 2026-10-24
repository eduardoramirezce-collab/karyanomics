# Phenotype → drug guidance: research and integration handoff

Updated 2026-10-24. Scope: CYP2C19, CYP2C9, VKORC1, SLCO1B1, TPMT, NUDT15, CYP4F2, ABCG2.

## What the data can answer

CPIC guidelines explain how a **known, reliable genetic result** can inform use of a **specific medication**. They do not rank every drug for a patient or prove that a drug will work, fail, or be safe. The starting question is: “For this medication and this clinical context, is there a source row that matches the verified result?” Final drug and dose decisions belong to a clinician. [CPIC guideline purpose](https://cpicpgx.org/guidelines/).

## Source-backed routes implemented for research

| Guideline family | Target genes and exact input | Current route status |
| --- | --- | --- |
| Clopidogrel | CYP2C19 phenotype **and** explicit cardiovascular/neurovascular context | CPIC row IDs indexed; the existing ACS/PCI demo has five source-linked patient summaries, still awaiting clinical review. |
| Thiopurines (azathioprine, mercaptopurine, thioguanine) | **Both** TPMT and NUDT15 phenotypes | CPIC row IDs indexed; absence or ambiguity of either gene blocks routing. The current CPIC update addresses combined phenotypes. |
| Statins | SLCO1B1 function; rosuvastatin additionally requires ABCG2 function; fluvastatin additionally requires **CYP2C9 activity score** | CPIC row IDs indexed for the exact gene combination per drug. A CYP2C9 phenotype label alone cannot fill a numeric activity-score key. |
| Warfarin | CYP2C9, VKORC1, CYP4F2 genotypes plus the guideline algorithm and clinical factors | **No simple phenotype-to-row route.** The CPIC API guideline explicitly says this recommendation does not follow simple diplotype-to-phenotype translation. A pair listing must never become a dose calculation. |

The versioned `data/cpic-recommendation-routes.v1.json` contains 134 exact CPIC lookup-key rows from three guideline families, plus metadata for the algorithm-based warfarin guideline. Rows with `No Result`, `Indeterminate`, or `n/a` lookup values are excluded. It stores recommendation IDs, exact phenotype/activity-score keys, population, classification, guideline URL and version; it stores **no** prescribing text or dose. `findResearchRecommendationRoute()` returns only a source-row candidate for clinician review. The other cataloged gene–drug pairs remain unindexed at the recommendation level. All source usage terms and clinical mappings still require review before public patient guidance.

Sources: [CPIC API](https://api.cpicpgx.org/), [2022 clopidogrel guideline](https://files.cpicpgx.org/data/guideline/publication/clopidogrel/2022/35034351.pdf), [2025 thiopurine update](https://files.cpicpgx.org/data/guideline/publication/thiopurines/2026/41618934.pdf), [2022 statin guideline](https://files.cpicpgx.org/data/guideline/publication/statins/2022/publication.pdf), [2017 warfarin guideline](https://files.cpicpgx.org/data/guideline/publication/warfarin/2017/28198005.pdf).

## Contract Kai's caller must satisfy

For **each required gene**, the handoff needs the gene symbol, diplotype/genotype, exact CPIC phenotype (or activity score where required), source/tool version, phenotype-table version, GRCh38 confirmation, coverage of all required positions, quality status, and missing/ambiguous-call status. These verification fields must come from a trusted caller or reviewed lab workflow, not be accepted from an uploaded JSON assertion. The route matcher currently accepts only complete, quality-passing VCF calls as research input; it does not turn them into patient guidance. A lab-report path needs its own verification process.

PharmCAT warns that an absent VCF position is a **no-call**, not a reference allele. Kai's caller must explicitly handle reference positions, no-calls, phasing and gene-specific methods before we mark any result complete. Its sample output can be compared with PharmCAT 3.4.0 reference reports, but those examples are test fixtures, not proof that real patient data is valid. [PharmCAT VCF requirements](https://pharmcat.clinpgx.org/using/VCF-Requirements/), [PharmCAT disclaimers](https://pharmcat.clinpgx.org/Disclaimers/).

## Integration sequence

1. Kai produces a validated per-gene call and evidence record. If a required gene is missing, low quality, ambiguous, or has incomplete coverage, return `Indeterminate`.
2. Resolve a medication to an exact ingredient/RxNorm identity. Do not infer from a fuzzy name, barcode, or adverse-event record. Require the indication/population that the guideline expects.
3. Use the research router to identify the exact CPIC recommendation ID and confirm the guideline version. Reject missing activity scores, multi-gene gaps, multiple matches and unsupported contexts. Warfarin goes to a separate reviewed algorithm workflow.
4. A qualified reviewer checks the source row's actual recommendation, patient population, contraindications, alternatives, wording, and ClinPGx data-usage terms. Only reviewed rows enter a versioned clinician guidance snapshot.
5. Generate a separate allowlisted patient summary with no dose or self-directed medication instruction. Keep clinical details behind real clinician authentication; an NPI lookup alone is insufficient.

The existing `assess()` remains limited to CYP2C19 + clopidogrel for ACS/PCI and is a separate synthetic demo. No uploaded VCF reaches it. The new router never sends genetic data to CPIC; all API fetches happen while preparing source files, not during a patient assessment.
