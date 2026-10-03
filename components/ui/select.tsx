export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-zinc-950 dark:text-white font-medium focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors shadow-2xs ${
        props.className ?? ""
      }`}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-zinc-950 dark:text-white font-medium placeholder:text-zinc-500 focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors shadow-2xs ${
        props.className ?? ""
      }`}
    />
  );
}
