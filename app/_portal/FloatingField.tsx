import type { InputHTMLAttributes, Ref } from "react";

type FloatingFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "placeholder"> & {
  id: string;
  label: string;
  /** Keep the label raised (for inputs that always show their own format, like dates). */
  alwaysFloat?: boolean;
  ref?: Ref<HTMLInputElement>;
};

/**
 * Text input with a real <label> that floats up on focus or when filled.
 * The label moves with transform only; the input box never changes size.
 */
export default function FloatingField({ id, label, alwaysFloat = false, className = "", ref, ...input }: FloatingFieldProps) {
  const raised = "-translate-y-[0.7rem] scale-[0.78]";
  return (
    <div className={`relative ${className}`}>
      <input
        id={id}
        ref={ref}
        placeholder=" "
        className="peer block h-14 w-full rounded-xl border border-ink/40 bg-white px-4 pt-5 pb-1.5 text-base text-ink transition-colors hover:border-ink/60 aria-[invalid=true]:border-red-700"
        {...input}
      />
      <label
        htmlFor={id}
        className={`pointer-events-none absolute top-4 left-4 origin-left text-base leading-6 text-ink/75 transition-transform duration-200 ease-out peer-focus:-translate-y-[0.7rem] peer-focus:scale-[0.78] peer-[:not(:placeholder-shown)]:-translate-y-[0.7rem] peer-[:not(:placeholder-shown)]:scale-[0.78] ${alwaysFloat ? raised : ""}`}
      >
        {label}
      </label>
    </div>
  );
}
