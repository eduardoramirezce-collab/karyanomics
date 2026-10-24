---
inclusion: always
---

# Clinical safety rules (apply to every file)

## Patient-facing text

- NEVER tell a patient to take, stop, skip, switch, or change the dose of any medication.
- NEVER show dose numbers, mg amounts, or dosing frequencies on patient screens.
- Use exactly three result levels: "typical", "may-differ", "talk-to-prescriber".
- The strongest patient message is: "Talk to your prescriber or pharmacist before your next dose."
- Write at a 6th–8th grade reading level. Short sentences. No jargon without a plain explanation.
- Never convey a result by color alone; always pair it with an icon and words.

## Clinician-facing text

- Clinician screens may show CPIC recommendation wording, strength, and alternatives.
- Clinician screens are only reachable after the NPI gate.

## Data integrity

- Never invent clinical content. Every recommendation must come from data/recommendations.json, and every entry must cite a CPIC guideline and a PMID.
- If a gene has no data for this user, or cannot be determined (e.g. CYP2D6 from a raw file), return "Indeterminate". Never guess a phenotype.
- openFDA adverse event data must always be shown with: "These are reports, not proof the drug caused the reaction."

## Privacy

- Genetic data is processed in the browser only. Never send genotype or raw file contents to any API route or external service.
