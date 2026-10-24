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
- Never claim a normal metabolizer will respond well or that a drug is safe. PGx covers only specific genetic factors.
- Never use openFDA adverse-event counts, population allele frequencies, or NPI lookup to infer an individual's medication response.
- CYP2D6 and HLA calls need specialized methods; do not infer them from a few VCF SNPs.
- PubMed citation URLs use `https://pubmed.ncbi.nlm.nih.gov/<PMID>/`.
- Clinical text remains `humanClinicalReview: false` until a qualified reviewer checks wording and population match.
- `data/target-genes.v1.json` fixes the eight-gene hackathon scope: CYP2C19, CYP2C9, VKORC1, SLCO1B1, TPMT, NUDT15, CYP4F2, ABCG2. `data/cpic-gene-drug-catalog.v1.json` is a research-only join between these genes, Kai's synthetic PharmCAT reports, and CPIC A/B `pair_view` metadata. A gene–drug pair is not a phenotype-specific recommendation. Never use catalog entries as patient guidance or infer a missing phenotype from them.
- For multi-gene guidelines, require every needed call and the exact source lookup key; never interpret a single gene row in isolation. Candidate recommendation rows stay ignored under `data/candidates/` until reviewed for phenotype, population, clinical context, and terms.
- `data/cpic-recommendation-routes.v1.json` holds research-only CPIC recommendation IDs and lookup keys for clopidogrel, thiopurines and selected statins; it has no recommendation text. `findResearchRecommendationRoute()` needs exact context and complete caller evidence. It does not authorize patient advice. Warfarin needs a separate guideline algorithm and clinical factors; do not route it by phenotype alone. See `docs/PHENOTYPE_TO_GUIDANCE_RESEARCH.md`.
- `data/drug-therapeutic-groups.v1.json` is an editorial navigation map from the ten indexed CPIC guideline families to Analgesics, Cardiovascular, Endocrine, GI, ID, Immune, Neuro, Psych, and Miscellaneous. Keep all nine areas, including empty ones, and retain exact drug/RxNorm, indexed genes, medication family, and guideline link. Do not use area membership as indication, patient-response, safety, or prescribing evidence. Patient-specific result categories require the verified caller and clinical review gates above.
- `data/rxnorm-drug-names.v1.json` supplies current U.S. Prescribable RxNorm generic/brand display names for the 34 indexed ingredients. Refresh with `npm run fetch:drug-names` into ignored `data/candidates/`, compare and review before promotion. Include only BN aliases backed by a single-ingredient SBD, preserve BN/product RxNorm IDs and source version, and leave absent brands empty. Do not use brand text to route clinical guidance; verified product/NDC → ingredient normalization is separate work. Show NLM attribution when displaying its names.

## VCF-to-phenotype handoff (Kai)

- `data/allele-definitions.json` and `data/cpic-diplotype-phenotypes.json` are generated from pinned PharmCAT 3.4.0 and CPIC sources by `npm run fetch:pgx-definitions`; never edit coordinates by hand.
- `callStarAlleles` produces research diplotypes and phenotypes for eight genes; missing/no-call positions become Indeterminate. An unphased double heterozygote may be reported in trans with `ambiguous: true`; guidance must reject it. Never infer `*1` from an absent VCF record.
- The phenotype-to-guidance side consumes a `DiplotypeCall[]` only with independent, complete build/coverage/assay-quality evidence. FILTER PASS by itself is insufficient clinical quality proof.
- Audit 2026-10-24 (`docs/STATUS_AUDIT_2026-10-24.md`): `parseVcf` reads only `GT` from FORMAT (no `PS`, `GQ`, `DP`, `AD`) and does not store QUAL. `callStarAlleles` ignores FILTER. A probe with hets in different `PS` blocks returned a confident CYP2C19 `*2/*17` with `ambiguous: false`; that is a defect. A `FILTER=LowQual`, `GQ=3`, `DP=2` row still produced `*2/*2`. Next caller work (Kai): PS-aware phasing, then a computed per-gene evidence object in `lib/pgx/callEvidence.ts` that replaces the hand-supplied `CallerEvidence`. Quality thresholds need a documented, sourced policy. Do not invent numeric cut-offs.
- `data/cpic-diplotype-phenotypes.json` is labeled `"CC0 1.0 (CPIC)"` by `scripts/fetch-pgx-definitions.mjs`. Per the rule above, do not assume CC0. Change the label in the script (not by hand) to cite the ClinPGx data usage policy pending confirmation.
- The three sample VCFs have `FORMAT=GT` only, all `FILTER=PASS`, all unphased. They do not exercise quality or phase-set evidence; add separate synthetic fixtures for that.
- PharmCAT reference outputs in `data/samples/` are the answer keys for the three sample VCFs; the caller tests compare with them. These fixtures do not validate patient assays.
- Sample provenance (answer keys generated with PharmCAT 3.4.0):
  - `maya.vcf`: PharmCAT example 2 VCF, unmodified (CYP2C19 *2/*2).
  - `alex.vcf`: PharmCAT example 1 VCF, unmodified (all reference).
  - `sam.vcf`: PharmCAT example 1 with GT set to 0/1 at rs1057910, rs4149056,
    rs9923231 (existing PharmCAT rows, no coordinates added).
- Never invent allele positions; read them from `data/allele-definitions.json`.
