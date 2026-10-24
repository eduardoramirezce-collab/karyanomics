# Clinical data pipeline and research plan

## What the product can answer

Given a **reliable PGx result**, a medication, and its clinical indication, the
engine can report whether a **published guideline identifies a genetic factor**
relevant to that use. It cannot declare that someone will respond correctly to
all substances, that a medication is safe, or that a dose is right from DNA
alone. Treatment depends on indication, other drugs, kidney/liver function,
age, history, contraindications, and monitoring. The FDA describes PGx as one
factor in drug response: https://www.fda.gov/medical-devices/precision-medicine/table-pharmacogenetic-associations

Use three result classes: (1) source-backed PGx finding for this exact context,
(2) no PGx change identified **within the assayed variants and guideline
scope**, and (3) insufficient or indeterminate information. Never turn class 2
into a guarantee of efficacy or safety.

## Input after a patient's test

For a real test, collect the laboratory's gene result, diplotype, inferred
phenotype, assay method, variants covered, no-call list, quality status,
reference genome when relevant, report version, and lab interpretation date.
The first app version should accept a **confirmed phenotype from a report** or
a synthetic persona. Parsing a generic PDF or consumer raw file is not enough
to verify the laboratory call.

If sequence data is available, PharmCAT accepts a GRCh38 VCF with the required
positions represented, including reference and no-call positions. Missing
positions are no-calls, not reference alleles:
https://pharmcat.clinpgx.org/using/VCF-Requirements/

CYP2D6 copy-number/structural variation and HLA typing require specialized
calling methods. PharmCAT normally receives those as outside calls:
https://pharmcat.clinpgx.org/using/

## Source roles

| Source | Use | Do not use it for |
| --- | --- | --- |
| CPIC API/guidelines | Gene-drug evidence, phenotype-specific action, indication, strength, provenance | General prediction for every drug |
| ClinPGx/PharmGKB annotations | Evidence discovery and cross-checking; keep evidence levels separate | Automatically upgrading a research association to a recommendation |
| PharmVar | Named allele definitions | Prescribing actions |
| PharmCAT | VCF-to-allele/phenotype workflow and reference examples | Independent validation of CPIC recommendations in its report |
| FDA PGx association table and drug labeling | Cross-check labeling and strength of claimed associations | Assuming every listed association mandates testing |
| RxNorm/openFDA NDC | Normalize entered/scanned drug identity | Inferring response from adverse-event reports |
| CDC GeT-RM | Genotype reference materials for assay/caller validation | Patient outcome prediction |
| 1000 Genomes / population frequencies | Check assay coverage across populations | Predicting an individual's response |

Use an official API or bulk download where available. A scrape of a rendered
page should be a last resort and must be versioned and reviewed. ClinPGx warns
its API shape may change and asks clients to stay at or below two requests per
second: https://api.clinpgx.org/

## Joining the data

`test result → named allele/diplotype → phenotype → (gene, RxNorm drug,
indication) → guideline row → patient explanation + clinician source`

An NDC identifies a product and must first resolve to the ingredient and
RxNorm concept. Brand or fuzzy text matches are candidates, not final joins.
Adverse-event data stays in its own context panel. A source row should retain
the guideline ID/version, recommendation ID, PMID, retrieval date, classification,
population/indication, exact matched phenotype, and a clinical review flag.

The current snapshot supports only CYP2C19 + clopidogrel for **ACS/PCI**. It
uses CPIC guideline PA166251443, version 71, and five source recommendation IDs.
The app-facing explanations are paraphrases marked as **not yet clinically
reviewed**. The refresh script writes a candidate file and does not alter the
bundled snapshot.

Kai's parser now reads VCF variants and the repository includes three sample
VCFs with PharmCAT 3.4.0 answer keys. Allele/phenotype calling and the
verification gate are still pending; no uploaded VCF reaches guidance.

## How to work in Kiro on `clinical-data`

1. Open this repository folder in Kiro. In GitHub Desktop, verify **Current
   Branch = clinical-data**; Kiro edits whichever branch this folder has open.
2. Review `.kiro/specs/pgx-clinical-data-layer/` and the data-source steering
   file. Ask Kiro to implement one checked spec task at a time.
3. Run `npm run fetch:clinpgx` to save a candidate. Compare its guideline
   version, rows, populations, and IDs with the reviewed snapshot. Review the
   source and usage terms before promoting any new row.
4. Run `npm test`, `npm run lint`, and `npx tsc --noEmit`. Commit and push the
   branch after a working increment; open a pull request for teammate review.

The team should explicitly agree on changes to `lib/pgx/types.ts`, because the
frontend imports those types. A deployed clinician workflow needs clinical,
laboratory, privacy, and regulatory review beyond this hackathon prototype.
