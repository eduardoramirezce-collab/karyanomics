#!/usr/bin/env node
/**
 * Build-time fetch of the reference data the star allele caller needs.
 *
 *   npm run fetch:pgx-definitions
 *
 * Writes:
 *   data/allele-definitions.json        PharmCAT v3.4.0 allele definitions (pinned tag)
 *   data/cpic-diplotype-phenotypes.json CPIC diplotype -> phenotype / activity score
 *
 * The app never fetches these at runtime. If any request fails or returns data
 * we don't expect, the script exits with an error before writing anything.
 */

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const PHARMCAT_TAG = "v3.4.0";
const PHARMCAT_BASE = `https://raw.githubusercontent.com/PharmGKB/PharmCAT/${PHARMCAT_TAG}/src/main/resources/org/pharmgkb/pharmcat/definition/alleles`;
const CPIC_BASE = "https://api.cpicpgx.org/v1/diplotype";

/** Genes called from the VCF, in output order. */
const GENES = ["CYP2C19", "CYP2C9", "VKORC1", "CYP4F2", "SLCO1B1", "ABCG2", "TPMT", "NUDT15"];
/** Genes CPIC assigns no phenotype to (guidelines use the genotype directly). */
const NO_PHENOTYPE_GENES = new Set(["VKORC1", "CYP4F2"]);

const PAGE_SIZE = 1000;
const REQUEST_DELAY_MS = 600; // stay well under public API rate limits

const BASES = /^[ACGT]+$/;
const IUPAC = /^[RYSWKMBDHVN]$/;

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function fail(message) {
  console.error(`fetch-pgx-definitions: ${message}`);
  process.exit(1);
}

async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) fail(`HTTP ${res.status} for ${url}`);
  return res.json();
}

/** A named-allele letter we know how to match: bases, one IUPAC code, or "X or Y". */
function isSupportedLetter(letter) {
  if (letter === null) return true;
  if (BASES.test(letter) || IUPAC.test(letter)) return true;
  return letter.split(" or ").every((part) => BASES.test(part));
}

async function fetchDefinition(gene) {
  const url = `${PHARMCAT_BASE}/${gene}_translation.json`;
  const raw = await getJson(url);

  if (raw.gene !== gene) fail(`${gene}: file reports gene ${raw.gene}`);
  if (!String(raw.genomeBuild).startsWith("GRCh38")) fail(`${gene}: build ${raw.genomeBuild}`);
  if (!Array.isArray(raw.variants) || !Array.isArray(raw.namedAlleles)) {
    fail(`${gene}: unexpected file shape`);
  }

  const positions = raw.variants.map((v) => {
    if (!v.chromosome || !Number.isInteger(v.position) || !BASES.test(v.ref) ||
        !Array.isArray(v.alts) || !v.alts.every((a) => BASES.test(a))) {
      fail(`${gene}: unexpected position ${JSON.stringify(v).slice(0, 120)}`);
    }
    return { chrom: v.chromosome, pos: v.position, rsid: v.rsid ?? null, ref: v.ref, alts: v.alts };
  });

  const namedAlleles = raw.namedAlleles.map((a) => {
    if (!Array.isArray(a.alleles) || a.alleles.length !== positions.length) {
      fail(`${gene} ${a.name}: allele list does not match positions`);
    }
    for (const letter of a.alleles) {
      if (!isSupportedLetter(letter)) fail(`${gene} ${a.name}: unsupported letter "${letter}"`);
    }
    return { name: a.name, reference: a.reference === true, alleles: a.alleles };
  });

  const refs = namedAlleles.filter((a) => a.reference);
  if (refs.length !== 1) fail(`${gene}: expected one reference allele, found ${refs.length}`);
  for (const [i, letter] of refs[0].alleles.entries()) {
    if (letter !== positions[i].ref) fail(`${gene}: reference allele disagrees with REF at ${positions[i].pos}`);
  }

  return {
    gene,
    chrom: raw.chromosome,
    pharmcatDefinitionVersion: raw.version,
    positions,
    namedAlleles,
  };
}

async function fetchPhenotypes(gene) {
  const rows = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const url = `${CPIC_BASE}?genesymbol=eq.${gene}&select=diplotype,generesult,totalactivityscore&order=diplotype&limit=${PAGE_SIZE}&offset=${offset}`;
    const page = await getJson(url);
    if (!Array.isArray(page)) fail(`${gene}: unexpected CPIC response`);
    rows.push(...page);
    await sleep(REQUEST_DELAY_MS);
    if (page.length < PAGE_SIZE) break;
  }

  const table = {};
  for (const row of rows) {
    if (typeof row.diplotype !== "string" || typeof row.generesult !== "string") {
      fail(`${gene}: unexpected CPIC row ${JSON.stringify(row)}`);
    }
    const score = row.totalactivityscore;
    table[row.diplotype] = {
      phenotype: row.generesult,
      activityScore: score === null || score === "n/a" ? null : String(score),
    };
  }
  return table;
}

/** Pretty JSON, but arrays of primitives stay on one line. */
function formatDefinitions(data) {
  return (
    JSON.stringify(data, null, 2).replace(
      /\[\s*((?:"(?:[^"\\]|\\.)*"|null|-?\d+(?:\.\d+)?)(?:,\s*(?:"(?:[^"\\]|\\.)*"|null|-?\d+(?:\.\d+)?))*)\s*\]/g,
      (_, inner) => `[${inner.replace(/,\s+/g, ", ")}]`,
    ) + "\n"
  );
}

/** One diplotype per line so diffs stay readable. */
function formatPhenotypes(data) {
  const { genes, ...meta } = data;
  const head = JSON.stringify(meta, null, 2).slice(0, -2);
  const geneBlocks = Object.entries(genes).map(([gene, table]) => {
    const lines = Object.entries(table).map(
      ([dip, entry]) => `      ${JSON.stringify(dip)}: ${JSON.stringify(entry)}`,
    );
    return `    ${JSON.stringify(gene)}: {\n${lines.join(",\n")}\n    }`;
  });
  return `${head},\n  "genes": {\n${geneBlocks.join(",\n")}\n  }\n}\n`;
}

async function main() {
  const retrievedAt = new Date().toISOString();

  const definitions = [];
  for (const gene of GENES) {
    definitions.push(await fetchDefinition(gene));
    console.log(`PharmCAT ${gene}: ${definitions.at(-1).positions.length} positions, ${definitions.at(-1).namedAlleles.length} alleles`);
  }

  const phenotypes = {};
  for (const gene of GENES) {
    if (NO_PHENOTYPE_GENES.has(gene)) continue;
    phenotypes[gene] = await fetchPhenotypes(gene);
    const n = Object.keys(phenotypes[gene]).length;
    if (n === 0) fail(`${gene}: CPIC returned no diplotypes`);

    // Coverage report: PharmCAT alleles CPIC never assigns a phenotype to.
    const names = new Set(Object.keys(phenotypes[gene]).flatMap((d) => d.split("/")));
    const uncovered = definitions
      .find((d) => d.gene === gene)
      .namedAlleles.map((a) => a.name)
      .filter((name) => !names.has(name));
    console.log(`CPIC ${gene}: ${n} diplotypes${uncovered.length ? `; no phenotype for ${uncovered.join(", ")}` : ""}`);
  }

  const definitionsFile = {
    _comment:
      "Generated by scripts/fetch-pgx-definitions.mjs. Do not edit by hand. A null letter means the reference letter at that position.",
    source: {
      name: "PharmCAT allele definitions",
      tag: PHARMCAT_TAG,
      url: PHARMCAT_BASE,
      license: "Mozilla Public License 2.0 (PharmCAT); definitions derived from ClinPGx/CPIC",
    },
    genome: "GRCh38",
    retrievedAt,
    genes: definitions,
  };

  const phenotypesFile = {
    _comment:
      "Generated by scripts/fetch-pgx-definitions.mjs. Do not edit by hand. VKORC1 and CYP4F2 have no CPIC phenotype; guidelines use the genotype directly.",
    source: {
      name: "CPIC diplotype table",
      url: CPIC_BASE,
      license: "CC0 1.0 (CPIC)",
    },
    retrievedAt,
    genes: phenotypes,
  };

  // Everything fetched and validated; only now write.
  await writeFile(join(root, "data", "allele-definitions.json"), formatDefinitions(definitionsFile));
  await writeFile(join(root, "data", "cpic-diplotype-phenotypes.json"), formatPhenotypes(phenotypesFile));
  console.log("Wrote data/allele-definitions.json and data/cpic-diplotype-phenotypes.json");
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
