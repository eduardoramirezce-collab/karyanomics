"use client";

import { useId, useState, type FormEvent } from "react";
import FloatingField from "../_portal/FloatingField";
import { primaryButton } from "../_portal/ui";

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
      <FloatingField id={`${id}-name`} label="Name" name="name" type="text" maxLength={100} autoComplete="name" />
      <FloatingField id={`${id}-email`} label="Email" name="email" type="email" maxLength={254} autoComplete="email" />
      <div className="flex min-h-11 items-center gap-3">
        <input id={`${id}-prescriber`} name="prescriber" type="checkbox" className="h-5 w-5 rounded accent-royal" />
        <label htmlFor={`${id}-prescriber`} className="text-base text-ink">I have a prescriber</label>
      </div>
      <button type="submit" className={`${primaryButton} self-start`}>Submit</button>
      <p aria-live="polite" className="text-base font-medium text-royal">
        {submitted ? "Thanks — this is a demo, nothing was sent or stored." : ""}
      </p>
    </form>
  );
}
