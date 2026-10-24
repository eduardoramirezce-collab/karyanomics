/** Test helpers for guidance snapshots. Fixtures copy real bundled rows; nothing is invented. */
import clopidogrel from "../../data/cpic-cyp2c19-clopidogrel.v1.json";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { GeneResult } from "../../lib/pgx/types";

/** A deep copy of the bundled clopidogrel snapshot, safe to mutate in a test. */
export function clopidogrelSnapshotCopy(): Record<string, unknown> & { records: Record<string, unknown>[] } {
  return structuredClone(clopidogrel) as unknown as Record<string, unknown> & { records: Record<string, unknown>[] };
}

/**
 * Read one gene's row from a PharmCAT 3.4.0 reference report (data/samples/<sample>.report.tsv).
 * These are Kai's answer-key fixtures, not output of our VCF caller.
 */
export function referenceCall(sample: "maya" | "alex" | "sam", gene: string): GeneResult {
  const text = readFileSync(join(process.cwd(), "data", "samples", `${sample}.report.tsv`), "utf8");
  const [, header, ...rows] = text.trimEnd().split(/\r?\n/);
  const columns = header.split("\t");
  const col = (name: string) => {
    const index = columns.indexOf(name);
    if (index < 0) throw new Error(`report.tsv has no "${name}" column`);
    return index;
  };
  const row = rows.map((line) => line.split("\t")).find((cells) => cells[col("Gene")] === gene);
  if (!row) throw new Error(`${gene} reference row missing for ${sample}`);
  const score = row[col("Recommendation Lookup Activity Score")]?.trim();
  return {
    gene,
    diplotype: row[col("Source Diplotype")],
    phenotype: row[col("Recommendation Lookup Phenotype")],
    activityScore: score ? score : null,
    source: "demo",
  };
}
