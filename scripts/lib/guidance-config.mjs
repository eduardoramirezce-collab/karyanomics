/**
 * One entry per curated CPIC guidance snapshot (one gene–drug pair).
 *
 * Shared by fetch-clinpgx.mjs (writes candidates), promote-cpic-candidate.mjs
 * (copies verbatim rows into a snapshot), build-patient-snapshot.mjs,
 * build-review-queue.mjs and validate-clinical-data.mjs. lib/pgx/assess.ts
 * imports the same snapshot files; tests/guidance-registry.test.ts checks that
 * both lists agree.
 *
 * `populations` limits which CPIC populations are promoted. `alternativesVocabulary`
 * is only a list of names to look for in CPIC's own text.
 */

export const USAGE_TERMS_URL = "https://www.clinpgx.org/page/dataUsagePolicy";

export const GUIDANCE = Object.freeze([
  {
    slug: "cyp2c19-clopidogrel",
    guidelineName: "CYP2C19 and Clopidogrel",
    drug: "clopidogrel",
    snapshotPath: "data/cpic-cyp2c19-clopidogrel.v1.json",
    candidatePath: "data/candidates/cpic-cyp2c19-clopidogrel.json",
    populations: ["CVI ACS PCI"],
    alternativesVocabulary: ["prasugrel", "ticagrelor", "ticlopidine"],
    nonNormalFinding: "reduced_activation",
    expectRecommendations: true,
  },
]);

export function guidanceBySlug(slug) {
  const entry = GUIDANCE.find((item) => item.slug === slug);
  if (!entry) throw new Error(`Unknown guidance slug "${slug}". Known: ${GUIDANCE.map((g) => g.slug).join(", ")}`);
  return entry;
}

/** "CYP2C19 result" or "TPMT and NUDT15 results". */
function genePhrase(genes) {
  return genes.length === 1 ? `${genes[0]} result` : `${genes.slice(0, -1).join(", ")} and ${genes.at(-1)} results`;
}

/**
 * Plain-language patient text, chosen only by the project finding label. It is
 * a project paraphrase (not CPIC wording), names no dose and no action, and is
 * created unreviewed. lib/pgx/patient-text-guard.ts must accept it.
 */
export function patientTextFor(finding, genes, drug) {
  const subject = genePhrase(genes);
  switch (finding) {
    case "reduced_activation":
      return `Your ${subject} may mean ${drug} works less well for this condition. Discuss the result with your prescriber or pharmacist.`;
    case "pgx_factor_identified":
      return `Your ${subject} may affect how your body handles ${drug}. Discuss the result with your prescriber or pharmacist.`;
    case "no_pgx_change_identified":
      return `This guideline does not link this ${subject} to a difference in how ${drug} works. Other factors still affect treatment.`;
    case "source_no_recommendation":
      return null;
    default:
      throw new Error(`Unknown finding ${finding}`);
  }
}
