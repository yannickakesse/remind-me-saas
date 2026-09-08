export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-md border border-ink-300 bg-canvas-raised px-3 py-2 text-ink-950 focus:border-signal ${
        props.className ?? ""
      }`}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-md border border-ink-300 bg-canvas-raised px-3 py-2 text-ink-950 placeholder:text-ink-500 focus:border-signal ${
        props.className ?? ""
      }`}
    />
  );
}
