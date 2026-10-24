"use client";

/**
 * Demo-only session. Holds { role, npi?, patientName, source, parsed, calls }
 * in React state. Nothing is sent to a server. sessionStorage holds only
 * { role, npi, sampleId } so a refresh can reload a bundled sample.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { DiplotypeCall, ParsedVcf } from "../../lib/pgx/types";
import { loadSample, type Loaded, type SessionSource } from "./load-vcf";
import { clearRecord, readRecord, writeRecord, type Role } from "./session-record";

export interface Session {
  role: Role;
  npi?: string;
  patientName: string;
  source: SessionSource;
  parsed: ParsedVcf;
  calls: DiplotypeCall[];
}

export type RestoreState = "idle" | "restoring" | "ready" | "none" | "failed";

interface SessionContextValue {
  session: Session | null;
  restore: RestoreState;
  start(role: Role, npi: string | null, loaded: Loaded): void;
  restoreFromRecord(): Promise<void>;
  signOut(): void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [restore, setRestore] = useState<RestoreState>("idle");

  const start = useCallback((role: Role, npi: string | null, loaded: Loaded) => {
    const next: Session = {
      role,
      ...(role === "clinician" && npi ? { npi } : {}),
      patientName: loaded.patientName,
      source: loaded.source,
      parsed: loaded.parsed,
      calls: loaded.calls,
    };
    if (loaded.source.kind === "sample") {
      writeRecord({ role, npi: role === "clinician" ? npi : null, sampleId: loaded.source.id });
    } else {
      clearRecord();
    }
    setSession(next);
    setRestore("ready");
  }, []);

  const restoreFromRecord = useCallback(async () => {
    const record = readRecord();
    if (!record) {
      clearRecord();
      setRestore("none");
      return;
    }
    setRestore("restoring");
    const result = await loadSample(record.sampleId);
    if (!result.ok) {
      setRestore("failed");
      return;
    }
    start(record.role, record.npi, result.value);
  }, [start]);

  const signOut = useCallback(() => {
    clearRecord();
    setSession(null);
    setRestore("idle");
  }, []);

  const value = useMemo(
    () => ({ session, restore, start, restoreFromRecord, signOut }),
    [session, restore, start, restoreFromRecord, signOut],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}
