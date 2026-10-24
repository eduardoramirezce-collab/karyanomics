/**
 * Name search over the indexed medications. Generic names open the ingredient
 * card directly. Brand names only point to the ingredient: per data-sources.md,
 * brand text never routes clinical guidance, so the user confirms the ingredient.
 */
import type { DrugResearchEntry, TherapeuticGroup } from "../../lib/pgx/drug-therapeutic-groups";

export interface DrugOption {
  /** Text shown in the suggestion list and matched against the query. */
  label: string;
  drug: DrugResearchEntry;
  /** Set when the option is a brand name rather than the generic name. */
  brand: string | null;
}

export function buildDrugOptions(groups: TherapeuticGroup[]): DrugOption[] {
  const drugs = groups.flatMap((group) => group.drugs);
  const generics = drugs.map((drug) => ({ label: drug.genericName, drug, brand: null }));
  const brands = drugs.flatMap((drug) => drug.brandNames.map((brand) => ({ label: brand.name, drug, brand: brand.name })));
  return [...generics, ...brands].sort((a, b) => a.label.localeCompare(b.label));
}

/** Exact matches first, then names starting with the query, then names containing it. */
export function searchDrugOptions(query: string, options: DrugOption[], limit = 8): DrugOption[] {
  const key = query.trim().toLowerCase();
  if (!key) return [];
  const rank = (option: DrugOption) => {
    const label = option.label.toLowerCase();
    if (label === key) return 0;
    if (label.startsWith(key)) return 1;
    if (label.includes(key)) return 2;
    return 3;
  };
  return options.filter((option) => rank(option) < 3)
    .sort((a, b) => rank(a) - rank(b) || a.label.localeCompare(b.label))
    .slice(0, limit);
}

export function exactDrugOption(query: string, options: DrugOption[]): DrugOption | null {
  const key = query.trim().toLowerCase();
  return options.find((option) => option.brand === null && option.label.toLowerCase() === key) ??
    options.find((option) => option.label.toLowerCase() === key) ?? null;
}
