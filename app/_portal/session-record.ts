/**
 * The only thing this app writes to browser storage: { role, npi, sampleId }
 * in sessionStorage, and only for bundled sample sessions. Never VCF text,
 * file names, or calls.
 */
import { findSample, type SampleId } from "./samples";

export const SESSION_KEY = "karyanomics.session.v1";

export type Role = "patient" | "clinician";

export interface SessionRecord {
  role: Role;
  npi: string | null;
  sampleId: SampleId;
}

/** Pure validation. Returns null for anything that is not a clean record. */
export function parseSessionRecord(raw: string | null): SessionRecord | null {
  if (!raw) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => !["role", "npi", "sampleId"].includes(key))) return null;
  if (record.role !== "patient" && record.role !== "clinician") return null;
  if (typeof record.sampleId !== "string" || !findSample(record.sampleId)) return null;
  if (record.role === "clinician") {
    if (typeof record.npi !== "string" || !record.npi.trim()) return null;
    return { role: "clinician", npi: record.npi.trim(), sampleId: record.sampleId as SampleId };
  }
  if (record.npi !== null && record.npi !== undefined) return null;
  return { role: "patient", npi: null, sampleId: record.sampleId as SampleId };
}

export function readRecord(): SessionRecord | null {
  try {
    return parseSessionRecord(window.sessionStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

export function writeRecord(record: SessionRecord): void {
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify({ role: record.role, npi: record.npi, sampleId: record.sampleId }));
  } catch {
    // Storage unavailable (e.g. private mode): keep the session in memory only.
  }
}

export function clearRecord(): void {
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore: nothing to clear.
  }
}
