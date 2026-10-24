---
inclusion: always
---

# Clinical safety rules

These rules are non-negotiable and apply to all code and content in this repo.

1. **No dosing instructions in patient-facing text.** Patient-facing text never
   tells a person to start, stop, or change a medication, and never states or
   implies a dose. That decision belongs to a clinician.
2. **Every recommendation cites its source.** No clinical wording is generated
   from the model's memory. All recommendation text, strength, and implications
   come from a reviewed, versioned file under `/data` that records the source
   URL and the guideline version or retrieval date.
3. **Genetic data never leaves the device.** Genotype and phenotype inputs are
   parsed and assessed in the browser. They are never sent to a server or logged.
4. **Missing or ambiguous data is not "normal".** When a genotype cannot be
   confidently mapped to a phenotype, or no reviewed recommendation matches,
   return `Indeterminate` / insufficient data. Never fall back to a reassuring
   default.
5. **No invented identifiers or clinical facts.** Gene–drug mappings, source
   URLs, guideline versions, and identifiers (RxNorm, PMID, NDC, NPI) must come
   from a real source. Anything uncertain is flagged `needs_human_review`.
6. **Synthetic data is labeled.** Demo personas and example inputs are clearly
   marked as fictional/synthetic and must not be presented as real samples.
