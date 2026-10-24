# Data/API register and upload contract

Updated 2026-10-24. This document distinguishes **implemented** access from proposed integrations. The application makes **no network request with a patient's uploaded file**. Keep the source inventory and this register updated with each source change.

| Source/API | Current status | Data used | Where | Role and limits |
| --- | --- | --- | --- | --- |
| CPIC API (`api.cpicpgx.org/v1`) | Implemented, build-time script only | Guideline, pair, recommendation_view | `scripts/fetch-clinpgx.mjs` → ignored `data/candidates/` | Source rows for reviewed, versioned PGx snapshot; candidate never auto-publishes. 600 ms spacing. |
| CPIC `pair_view` gene catalog | Implemented, build-time research index | Non-provisional A/B gene–drug pair metadata for eight target genes | `scripts/fetch-gene-drug-catalog.mjs` → ignored candidate; versioned index in `data/cpic-gene-drug-catalog.v1.json` | 41 exact RxNorm/guideline pairs across all eight genes. Pair metadata alone never drives patient guidance. |
| Therapeutic-area catalog | Implemented, offline editorial mapping; no API call | Nine requested areas and ten CPIC guideline families | `data/drug-therapeutic-groups.v1.json`, `lib/pgx/drug-therapeutic-groups.ts`, `/drugs` | Deduplicates 41 pairs to 34 ingredients. Broad area and family labels aid navigation, not patient-response prediction. Empty areas remain empty. |
| CPIC `recommendation_view` research index | Candidate script only | Phenotype and lookup-key metadata for guidelines linked to the eight targets | `scripts/fetch-recommendation-index.mjs` → ignored `data/candidates/` | Not promoted to guidance; some lookup keys require genes outside our eight-gene scope. |
| CPIC exact research routes | Implemented, offline source-row matcher | 134 source IDs/keys for clopidogrel, statins and thiopurines; warfarin guideline metadata | `scripts/build-recommendation-routes.mjs` → ignored candidate; `data/cpic-recommendation-routes.v1.json` and `lib/pgx/research-recommendation-route.ts` | No recommendation text or doses. Requires exact context, complete caller evidence and activity scores where needed; never makes patient advice. |
| ClinPGx data usage policy | Linked and review pending | Terms | Snapshot and inventory | Confirm redistribution terms before public release; do not assume a blanket license. |
| PharmCAT | Sample fixtures and PharmCAT 3.4.0 answer keys added; **caller not integrated** | Reference output for allele/phenotype validation | `public/samples/`, `data/samples/` | GRCh38 and all required positions, including reference/no-call; browser VCF parser does not call alleles. |
| 23andMe-style raw data | Local parser implemented | rsID/chromosome/position/genotype coverage counts | `lib/pgx/upload.ts` | Preview only; no clinical phenotype inference. |
| RxNorm/RxNav | Planned | Ingredient and RxCUI normalization | No code yet | Required before a scanned/entered product can be joined to a CPIC drug. |
| NLM RxClass API | Researched, not integrated | Standardized drug classes | No code yet | Potential later cross-check for medication families; current nine-area taxonomy is an explicitly editorial mapping to existing CPIC guideline families. See [official RxClass API](https://www.lhncbc.nlm.nih.gov/RxNav/APIs/RxClassAPIs.html) and its terms. |
| openFDA NDC/event | Planned | Product lookup / separate adverse-event context | No code yet | Never backs a PGx recommendation or a causal claim. |
| CMS NPPES | Planned | Public NPI lookup | No code yet | Not clinical evidence and not real clinician authentication. |
| PubMed | Citation links only | Guideline PMID | Snapshot | Not queried at runtime. |
| PharmVar | Research source documented, **not integrated** | Allele definitions | No code yet | Needed for a validated allele-calling pipeline; not prescribing advice. |
| FDA PGx table/labeling | Research cross-check, **not integrated** | Label context | No code yet | Does not replace a matching CPIC guideline. |

## Browser upload path

`file input or sample selection → local VCF parser / other-format inspector → format and no-call summary → (future: validated allele/phenotype caller and verification gate) → CPIC lookup`.

The parser currently accepts:

- `karyanomics-pgx-v1` JSON with `format`, `geneResults[]` (`gene`, `diplotype`, `phenotype`, `callStatus`), plus recommended `labName`, `reportDate`, `assayMethod`, `coveredVariants`. See [`data/examples/synthetic-pgx-report.v1.json`](../data/examples/synthetic-pgx-report.v1.json). Parsed values remain **unverified** regardless of a self-declared `complete` status; they are not fed to `assess()` automatically.
- Uncompressed VCF 4.x: Kai's `parseVcf` reads the first sample's genotypes and reports build/sample/line warnings; `VcfUpload` offers three synthetic sample files. The other-format inspector reuses this parser for VCF previews. No allele/phenotype call. A full pipeline must reject unsuitable sample/build, validate coverage, reference bases, quality, phase, and PharmCAT-required positions. CYP2D6/HLA need outside calls.
- Four-column consumer raw TXT/TSV (`rsid`, chromosome, position, genotype): structural preflight and no-call counts only. Genome build, strand and assay coverage are not established.

PDFs, compressed files, arbitrary JSON, and multi-sample VCF interpretation are not supported. All files are read in the browser; the intake code has no `fetch`, API route, local storage, or logging. The page shows only category and counts for uploads. Its assessment module imports `data/patient-guidance.v1.json`, an allowlisted public snapshot without clinician recommendation wording, strength, alternatives, or doses. `npm run build:patient-data` regenerates that file and `npm run validate:clinical` checks it against the source snapshot.

## Category meanings

- `review_required`: structured report parsed, but authenticity, coverage and lab interpretation must be checked.
- `missing_calls`: structured report contains an incomplete/uncertain result; no guidance.
- `needs_external_caller`: VCF or raw SNP data needs a validated allele/phenotype workflow.
- `invalid`: file cannot be safely recognized.

Only the explicitly complete fictional phenotype uses the source-backed `assess()` lookup in the UI today. Five CYP2C19 phenotypes are covered for clopidogrel/ACS-PCI; the VCF allele/phenotype caller is still unimplemented. The example is separate from the sample VCF chooser. Its wording still awaits clinical review. The UI does not expose the full CPIC recommendation or doses to a patient.

## Refresh and review

1. Run `npm run fetch:clinpgx` to create a candidate snapshot from the official CPIC API.
2. Run `npm run validate:clinical` and compare source IDs, version, phenotype, indication, strength and terms to the curated snapshot.
3. Have a qualified reviewer approve text and indication mapping before changing `humanClinicalReview` or adding new rows.
4. Record endpoint, retrieval date, guideline/version, source IDs, review outcome, and commit in this register / change log. Do not scrape rendered pages when an official API or bulk download exists.

Official references: [CPIC API](https://api.cpicpgx.org/), [ClinPGx API/limits](https://api.clinpgx.org/), [ClinPGx data usage policy](https://www.clinpgx.org/page/dataUsagePolicy), [PharmCAT VCF requirements](https://pharmcat.clinpgx.org/using/VCF-Requirements/), [PharmCAT inputs/outside calls](https://pharmcat.clinpgx.org/using/), [23andMe raw-data limits](https://customercare.23andme.com/hc/en-us/articles/115004310067-Navigating-Your-Raw-Data).
