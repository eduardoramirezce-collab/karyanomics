import catalog from "../../data/cpic-gene-drug-catalog.v1.json";
import taxonomy from "../../data/drug-therapeutic-groups.v1.json";

export interface DrugResearchEntry {
  drug: string;
  rxnormId: string;
  family: string;
  groupId: string;
  guideline: string;
  guidelineUrl: string;
  indexedGenes: string[];
  personalizedGuidanceReady: false;
}

export interface TherapeuticGroup {
  id: string;
  label: string;
  drugs: DrugResearchEntry[];
}

/** Navigation over CPIC pair metadata. No phenotype, response, or dose inference. */
export function listDrugTherapeuticGroups(): TherapeuticGroup[] {
  const groupById = new Map(taxonomy.groups.map((group) => [group.id, {
    ...group,
    drugs: [] as DrugResearchEntry[],
  }]));
  const familyByGuideline = new Map(taxonomy.guidelineFamilies.map((entry) => [entry.guideline, entry]));
  const byRxnorm = new Map<string, DrugResearchEntry>();

  for (const { gene, pairs } of catalog.genes) {
    for (const pair of pairs) {
      const family = familyByGuideline.get(pair.guideline);
      if (!family) throw new Error(`No therapeutic group for CPIC guideline: ${pair.guideline}`);
      const existing = byRxnorm.get(pair.rxnormId);
      if (existing) {
        if (existing.drug !== pair.drug || existing.guideline !== pair.guideline ||
          existing.guidelineUrl !== pair.guidelineUrl || existing.groupId !== family.groupId) {
          throw new Error(`Conflicting CPIC pair identity: ${pair.rxnormId}`);
        }
        if (!existing.indexedGenes.includes(gene)) existing.indexedGenes.push(gene);
      } else {
        byRxnorm.set(pair.rxnormId, {
          drug: pair.drug,
          rxnormId: pair.rxnormId,
          family: family.family,
          groupId: family.groupId,
          guideline: pair.guideline,
          guidelineUrl: pair.guidelineUrl,
          indexedGenes: [gene],
          personalizedGuidanceReady: false,
        });
      }
    }
  }

  for (const drug of byRxnorm.values()) {
    const group = groupById.get(drug.groupId);
    if (!group) throw new Error(`Unknown therapeutic group: ${drug.groupId}`);
    drug.indexedGenes.sort();
    group.drugs.push(drug);
  }
  return [...groupById.values()].map((group) => ({
    ...group,
    drugs: group.drugs.sort((a, b) => a.drug.localeCompare(b.drug)),
  }));
}

/** Exact ingredient name or CPIC RxNorm ID only; no brand, product, or NDC guessing. */
export function findDrugResearchEntry(query: string): DrugResearchEntry | undefined {
  const key = query.trim().toLowerCase();
  if (!key) return undefined;
  return listDrugTherapeuticGroups().flatMap((group) => group.drugs)
    .find((drug) => drug.drug.toLowerCase() === key || drug.rxnormId.toLowerCase() === key);
}
