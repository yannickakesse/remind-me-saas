import { Spinner } from "./spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success" | "link";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Affiche un spinner et désactive le bouton — pour toute action réseau (§88 du prompt maître). */
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-signal text-white hover:bg-signal/90 disabled:bg-signal/60",
  secondary:
    "bg-canvas-raised text-ink-950 border border-ink-300 hover:bg-ink-100 disabled:opacity-60",
  ghost: "bg-transparent text-ink-700 hover:bg-ink-100 disabled:opacity-60",
  danger: "bg-danger text-white hover:bg-danger/90 disabled:bg-danger/60",
  success: "bg-positive text-white hover:bg-positive/90 disabled:bg-positive/60",
  link: "bg-transparent text-signal underline-offset-2 hover:underline disabled:opacity-60 px-0",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm gap-1.5",
  md: "px-4 py-2.5 text-sm gap-2",
  lg: "px-5 py-3 text-base gap-2",
};

/**
 * Classes utilitaires du bouton, exposées pour styler un élément qui n'est
 * PAS un <button> (typiquement un `next/link` `<Link>`, qui ne peut pas
 * être un enfant de <button>) tout en gardant exactement la même
 * apparence — évite de dupliquer ces classes ailleurs (§101 du prompt maître).
 */
export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  fullWidth = false
): string {
  const isLink = variant === "link";
  return `inline-flex items-center justify-center font-medium transition-colors ${
    isLink ? "" : "rounded-md"
  } ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${fullWidth ? "w-full" : ""}`;
}

/**
 * Bouton générique — variants/states du §88 du prompt maître.
 * Toujours un état loading disponible pour toute action déclenchant un
 * appel réseau, afin qu'un bouton ne reste jamais bloqué silencieusement.
 */
export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  disabled,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const isLink = variant === "link";
  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center font-medium transition-colors disabled:cursor-not-allowed ${
        isLink ? "" : "rounded-md"
      } ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${fullWidth ? "w-full" : ""} ${className}`}
    >
      {loading ? <Spinner size={size === "lg" ? 18 : 14} /> : null}
      {children}
    </button>
  );
}
