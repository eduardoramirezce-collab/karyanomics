import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import guidance from "../data/patient-guidance.v1.json";
import { analyzeVcf } from "../lib/pgx/analyzeVcf";
import { listDrugTherapeuticGroups, type DrugResearchEntry } from "../lib/pgx/drug-therapeutic-groups";
import {
  buildDrugResult,
  buildGeneCards,
  diplotypeTokens,
  geneStatus,
  GENERIC_PRESCRIBER_LINE,
  STATUS_LEVEL,
  TYPICAL_LIMIT_LINE,
  type ClinicianDrugResult,
  type Role,
  type SampleId,
} from "../lib/pgx/drugResult";
import type { DiplotypeCall } from "../lib/pgx/types";

const samples = Object.fromEntries((["maya", "alex", "sam"] as const).map((id) => [
  id, analyzeVcf(readFileSync(join(process.cwd(), `public/samples/${id}.vcf`), "utf8")),
])) as Record<SampleId, ReturnType<typeof analyzeVcf>>;

const drugs = listDrugTherapeuticGroups().flatMap((group) => group.drugs);
function drug(name: string): DrugResearchEntry {
  const entry = drugs.find((item) => item.drug === name);
  if (!entry) throw new Error(`missing drug ${name}`);
  return entry;
}
function run(id: SampleId, name: string, role: Role = "patient", upload = false) {
  return buildDrugResult({
    drug: drug(name), role, source: upload ? { kind: "upload" } : { kind: "sample", id },
    parsed: samples[id].parsed, calls: samples[id].calls,
  });
}

describe("drugResult with the bundled sample VCFs", () => {
  it("Maya + clopidogrel: may change, with the CYP2C19 patient text", () => {
    const result = run("maya", "clopidogrel");
    const poorText = guidance.records.find((row) => row.phenotype === "Poor Metabolizer" && row.context === "acs_pci")!.patientText;
    expect(result.status).toBe("Your genes may change how this works");
    expect(result.level).toBe("may-differ");
    expect(result.genes).toEqual([{ gene: "CYP2C19", phenotypeText: "Poor Metabolizer" }]);
    expect(result.guidanceLine).toBe(poorText);
    expect(result.conditionLabel).toBe("For heart attack or heart stent care (ACS/PCI)");
    expect(result.reviewNote).toBe("Demo wording awaits qualified clinical review.");
  });

  it("Sam + simvastatin: may change (SLCO1B1 Decreased Function)", () => {
    const result = run("sam", "simvastatin");
    expect(result.status).toBe("Your genes may change how this works");
    expect(result.level).toBe("may-differ");
    expect(result.genes).toContainEqual({ gene: "SLCO1B1", phenotypeText: "Decreased Function" });
    expect(result.guidanceLine).toBe(GENERIC_PRESCRIBER_LINE);
  });

  it("Alex + simvastatin: typical", () => {
    const result = run("alex", "simvastatin");
    expect(result.status).toBe("Typical");
    expect(result.level).toBe("typical");
    expect(result.genes.every((line) => ["Normal Metabolizer", "Normal Function"].includes(line.phenotypeText))).toBe(true);
    expect(result.typicalLimitLine).toBe(TYPICAL_LIMIT_LINE);
  });

  it("any patient + warfarin: needs a clinician-run calculation", () => {
    for (const id of ["maya", "alex", "sam"] as const) {
      for (const role of ["patient", "clinician"] as const) {
        const result = run(id, "warfarin", role);
        expect(result.status).toBe("Needs a clinician-run calculation");
        expect(result.level).toBe("talk-to-prescriber");
      }
    }
  });

  it("uploaded Maya file never gets assessPatient text", () => {
    const result = run("maya", "clopidogrel", "patient", true);
    expect(result.status).toBe("Your genes may change how this works");
    expect(result.guidanceLine).toBe(GENERIC_PRESCRIBER_LINE);
    expect(result.conditionLabel).toBeNull();
    const texts = guidance.records.map((row) => row.patientText);
    expect(JSON.stringify(result)).not.toContain(texts[0]);
  });

  it("guidelines naming genes the file can't read give can't tell", () => {
    const amitriptyline = run("alex", "amitriptyline");
    expect(amitriptyline.status).toBe("Can't tell from this file");
    expect(amitriptyline.unreadGeneLine).toBe("This medication also depends on CYP2D6, which can't be read from this file.");
    expect(run("alex", "phenytoin").unreadGeneLine).toContain("HLA-B");
  });

  it("maps every status to one steering level", () => {
    expect(STATUS_LEVEL).toEqual({
      "Typical": "typical",
      "Your genes may change how this works": "may-differ",
      "Can't tell from this file": "talk-to-prescriber",
      "Needs a clinician-run calculation": "talk-to-prescriber",
    });
  });

  it("clinician clopidogrel rows follow the CPIC populations; uploads stay unverified", () => {
    const sample = run("maya", "clopidogrel", "clinician") as ClinicianDrugResult;
    expect(sample.routeRows.map((row) => row.population)).toEqual(["CVI ACS PCI", "CVI non-ACS non-PCI", "NVI"]);
    expect(sample.routeRows.every((row) => row.kind === "source_row")).toBe(true);
    const upload = run("maya", "clopidogrel", "clinician", true) as ClinicianDrugResult;
    expect(upload.routeRows.every((row) => row.kind === "note" && row.status === "unverified_gene_call")).toBe(true);
  });
});

describe("gene cards and labels", () => {
  it("one card per caller gene, clinician detail only for clinicians", () => {
    const patient = buildGeneCards(samples.maya.calls, "patient");
    expect(patient.map((card) => card.gene)).toEqual(samples.maya.calls.map((call) => call.gene));
    expect(patient.some((card) => card.clinician)).toBe(false);
    expect(patient.find((card) => card.gene === "CYP2D6")!.phenotypeText).toBe("CYP2D6 cannot be determined from this file.");
    expect(patient.find((card) => card.gene === "VKORC1")!.status).toBe("Needs a clinician-run calculation");
    expect(buildGeneCards(samples.maya.calls, "clinician").every((card) => card.clinician)).toBe(true);
  });

  it("geneStatus covers each branch", () => {
    const base: DiplotypeCall = { gene: "CYP2C9", diplotype: "*1/*1", phenotype: "Normal Metabolizer", activityScore: "2.0", source: "vcf", ambiguous: false };
    expect(geneStatus(base)).toBe("Typical");
    expect(geneStatus({ ...base, phenotype: "Intermediate Metabolizer" })).toBe("Your genes may change how this works");
    expect(geneStatus({ ...base, phenotype: null })).toBe("Needs a clinician-run calculation");
    expect(geneStatus({ ...base, ambiguous: true })).toBe("Can't tell from this file");
  });

  it("labels only CYP2C19 *38 tokens as standard", () => {
    expect(diplotypeTokens("CYP2C19", "*38/*2").map((token) => token.standard38)).toEqual([true, false]);
    expect(diplotypeTokens("CYP2C19", "*138/*3").some((token) => token.standard38)).toBe(false);
    expect(diplotypeTokens("CYP2C9", "*38/*38").some((token) => token.standard38)).toBe(false);
  });
});
