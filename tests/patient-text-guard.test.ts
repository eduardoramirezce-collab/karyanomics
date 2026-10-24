import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { PATIENT_MESSAGES } from "../lib/pgx/assess-patient";
import { findPatientTextViolations, isPatientSafeText } from "../lib/pgx/patient-text-guard";
import patientSnapshot from "../data/patient-guidance.v1.json";

describe("shared patient-text guard", () => {
  it.each([
    "75mg", "75 mg", "75 mg/day", "<20mg/day", "2 mg/kg/day", "50%", "milligrams", "a lower dose",
    "Avoid clopidogrel", "avoid", "switch", "skip", "change", "changes", "discontinue", "increase",
    "decrease", "reduce", "reduced", "titrate", "start", "stop", "take", "twice a day", "your next dose",
  ])("blocks %j", (text) => {
    expect(isPatientSafeText(text)).toBe(false);
  });

  it.each([
    "Discuss the result with your prescriber or pharmacist.",
    "Other factors still affect treatment.",
    "Your CYP2C19 result may mean clopidogrel works less well for this condition.",
  ])("allows %j", (text) => {
    expect(findPatientTextViolations(text)).toEqual([]);
  });

  it("flags a forbidden word wherever it appears", () => {
    const forbidden = fc.constantFrom("avoid", "Switch", "skip", "change", "discontinue", "increase",
      "decrease", "reduce", "titrate", "stop", "start", "75mg", "10 mg", "milligram", "dose", "25%");
    fc.assert(fc.property(fc.string(), forbidden, fc.string(), (before, word, after) =>
      !isPatientSafeText(`${before} ${word} ${after}`)));
  });

  it("passes every bundled patient text and every patient message", () => {
    const texts = patientSnapshot.guidelines.flatMap((guideline) =>
      guideline.records.map((record) => record.patientText));
    expect(texts.length).toBeGreaterThan(0);
    for (const text of [...texts, ...Object.values(PATIENT_MESSAGES)]) {
      expect(findPatientTextViolations(text)).toEqual([]);
    }
  });
});
