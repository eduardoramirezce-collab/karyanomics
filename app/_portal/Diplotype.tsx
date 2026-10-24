"use client";

import { Fragment, useId, useState } from "react";
import { diplotypeTokens, STANDARD_38_TOOLTIP } from "../../lib/pgx/drugResult";

/** Shows a diplotype; a CYP2C19 "*38" token reads "*38 (standard)" with a hover/focus tooltip. */
export default function Diplotype({ gene, diplotype }: { gene: string; diplotype: string | null }) {
  if (!diplotype) return <span>Not determined</span>;
  const tokens = diplotypeTokens(gene, diplotype);
  return (
    <span className="break-words font-mono">
      {tokens.map((token, index) => (
        <Fragment key={index}>
          {index > 0 && "/"}
          {token.standard38 ? <Standard38 /> : token.allele}
        </Fragment>
      ))}
    </span>
  );
}

function Standard38() {
  const id = useId();
  const [dismissed, setDismissed] = useState(false);
  return (
    <span
      tabIndex={0}
      aria-describedby={id}
      onKeyDown={(event) => { if (event.key === "Escape") setDismissed(true); }}
      onBlur={() => setDismissed(false)}
      onMouseLeave={() => setDismissed(false)}
      className="group relative cursor-help rounded underline decoration-dotted underline-offset-2"
    >
      *38 (standard)
      <span
        role="tooltip"
        id={id}
        className={`invisible absolute bottom-full left-0 z-10 mb-1.5 w-56 max-w-[70vw] rounded-xl bg-ink px-3 py-2 font-sans text-sm font-normal text-white shadow-[0_12px_30px_-12px_rgba(27,31,75,0.7)] ${dismissed ? "" : "group-hover:visible group-focus:visible"}`}
      >
        {STANDARD_38_TOOLTIP}
      </span>
    </span>
  );
}
