import { describe, expect, it } from "vitest";
import catalog from "../data/cpic-gene-drug-catalog.v1.json";
import { findDrugResearchEntry, listDrugTherapeuticGroups } from "../lib/pgx/drug-therapeutic-groups";

describe("research-only therapeutic-area navigation", () => {
  it("places every indexed ingredient once in the requested nine groups", () => {
    const groups = listDrugTherapeuticGroups();
    const drugs = groups.flatMap((group) => group.drugs);
    const sourceIds = new Set(catalog.genes.flatMap((gene) => gene.pairs.map((pair) => pair.rxnormId)));
    expect(groups.map((group) => group.id)).toEqual([
      "analgesics", "cardiovascular", "endocrine", "gi", "id", "immune", "neuro", "psych", "miscellaneous",
    ]);
    expect(drugs).toHaveLength(34);
    expect(new Set(drugs.map((drug) => drug.rxnormId))).toEqual(sourceIds);
    expect(groups.find((group) => group.id === "endocrine")?.drugs).toEqual([]);
    expect(groups.find((group) => group.id === "miscellaneous")?.drugs).toEqual([]);
    expect(drugs.every((drug) => drug.personalizedGuidanceReady === false)).toBe(true);
  });

  it("preserves multi-gene source associations and exact identity", () => {
    expect(findDrugResearchEntry("warfarin")).toMatchObject({
      groupId: "cardiovascular", family: "Anticoagulant", indexedGenes: ["CYP2C9", "CYP4F2", "VKORC1"],
    });
    expect(findDrugResearchEntry("RxNorm:1256")).toMatchObject({
      drug: "azathioprine", groupId: "immune", indexedGenes: ["NUDT15", "TPMT"],
    });
    expect(findDrugResearchEntry("rosuvastatin")?.indexedGenes).toEqual(["ABCG2", "SLCO1B1"]);
    expect(findDrugResearchEntry("Lipitor")).toBeUndefined();
  });
});
