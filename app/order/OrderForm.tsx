"use client";

import { useId, useState, type FormEvent } from "react";
import { fieldInput, primaryButton } from "../_portal/ui";

/** Demo form: values stay in page memory. Nothing is sent or stored. */
export default function OrderForm() {
  const id = useId();
  const [submitted, setSubmitted] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-name`} className="text-base font-medium text-slate-900">Name</label>
        <input id={`${id}-name`} name="name" type="text" maxLength={100} autoComplete="name" className={fieldInput} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-email`} className="text-base font-medium text-slate-900">Email</label>
        <input id={`${id}-email`} name="email" type="email" maxLength={254} autoComplete="email" className={fieldInput} />
      </div>
      <div className="flex min-h-11 items-center gap-3">
        <input id={`${id}-prescriber`} name="prescriber" type="checkbox" className="h-5 w-5 accent-teal-700" />
        <label htmlFor={`${id}-prescriber`} className="text-base text-slate-900">I have a prescriber</label>
      </div>
      <button type="submit" className={`${primaryButton} self-start`}>Submit</button>
      <p aria-live="polite" className="text-base font-medium text-teal-800">
        {submitted ? "Thanks — this is a demo, nothing was sent or stored." : ""}
      </p>
    </form>
  );
}
