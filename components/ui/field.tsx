interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}

export function Field({ label, htmlFor, error, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink-700">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput(
  props: React.InputHTMLAttributes<HTMLInputElement>
) {
  return (
    <input
      {...props}
      className={`w-full rounded-md border border-ink-300 bg-canvas-raised px-3 py-2 text-ink-950 placeholder:text-ink-500 focus:border-signal ${
        props.className ?? ""
      }`}
    />
  );
}

export function PrimaryButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>
) {
  return (
    <button
      {...props}
      className={`w-full rounded-md bg-signal px-4 py-2.5 font-medium text-white transition-colors hover:bg-signal/90 disabled:cursor-not-allowed disabled:opacity-60 ${
        props.className ?? ""
      }`}
    />
  );
}
