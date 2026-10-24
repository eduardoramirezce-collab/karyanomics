import type { DisplayStatus } from "../../lib/pgx/drugResult";

/** Every status is shown as an icon plus words, never color alone. */
const STYLES: Record<DisplayStatus, string> = {
  "Typical": "border-green-700 bg-green-50 text-green-900",
  "Your genes may change how this works": "border-amber-700 bg-amber-50 text-amber-950",
  "Can't tell from this file": "border-slate-500 bg-slate-100 text-slate-900",
  "Needs a clinician-run calculation": "border-indigo-700 bg-indigo-50 text-indigo-950",
};

function Icon({ status }: { status: DisplayStatus }) {
  const common = {
    "aria-hidden": true,
    focusable: false,
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "shrink-0",
  };
  switch (status) {
    case "Typical":
      return <svg {...common}><circle cx="12" cy="12" r="10" /><path d="m7.5 12.5 3 3 6-6.5" /></svg>;
    case "Your genes may change how this works":
      return <svg {...common}><path d="M12 3 2 20h20L12 3z" /><path d="M12 10v4" /><path d="M12 17h.01" /></svg>;
    case "Can't tell from this file":
      return <svg {...common}><circle cx="12" cy="12" r="10" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6" /><path d="M12 17h.01" /></svg>;
    case "Needs a clinician-run calculation":
      return <svg {...common}><rect x="5" y="2.5" width="14" height="19" rx="2" /><path d="M8 6.5h8" /><path d="M8.5 11h.01M12 11h.01M15.5 11h.01M8.5 14.5h.01M12 14.5h.01M15.5 14.5h.01M8.5 18h.01M12 18h3.5" /></svg>;
  }
}

export default function StatusChip({ status }: { status: DisplayStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${STYLES[status]}`}>
      <Icon status={status} />
      <span>{status}</span>
    </span>
  );
}
