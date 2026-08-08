import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl bg-card p-4 shadow-card ring-1 ring-border/60", className)}>
      {children}
    </div>
  );
}

type BtnProps = {
  children: ReactNode;
  variant?: "primary" | "ghost" | "outline" | "danger" | "success";
  className?: string;
  full?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

const variants: Record<string, string> = {
  primary: "bg-gradient-primary text-primary-foreground shadow-glow",
  ghost: "bg-secondary text-secondary-foreground",
  outline: "bg-card text-foreground ring-1 ring-border",
  danger: "bg-destructive text-destructive-foreground",
  success: "bg-success text-success-foreground",
};

export function Btn({ children, variant = "primary", className, full, ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50",
        variants[variant],
        full && "w-full",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-sm font-semibold text-foreground">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl bg-secondary px-4 py-3 text-sm text-foreground outline-none ring-1 ring-transparent placeholder:text-muted-foreground focus:ring-ring";

export function SubHeader({ title, to = "/app/me" }: { title: string; to?: string }) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-2 bg-gradient-deep px-3 py-4 text-primary-foreground">
      <Link to={to} className="rounded-full p-1.5 hover:bg-primary-foreground/10">
        <ChevronLeft className="size-5" />
      </Link>
      <h1 className="text-base font-bold">{title}</h1>
    </header>
  );
}

export function StatTile({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl bg-gradient-primary p-4 text-primary-foreground", className)}>
      <p className="text-xs opacity-90">{label}</p>
      <p className="mt-1 text-xl font-extrabold">{value}</p>
    </div>
  );
}

export function Empty({ title, text }: { title: string; text?: string }) {
  return (
    <Card className="text-center">
      <p className="font-bold text-foreground">{title}</p>
      {text ? <p className="mt-1 text-sm text-muted-foreground">{text}</p> : null}
    </Card>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-warning/20 text-warning-foreground",
    approved: "bg-success/15 text-success",
    rejected: "bg-destructive/15 text-destructive",
  };
  const label: Record<string, string> = {
    pending: "En attente",
    approved: "Validé",
    rejected: "Rejeté",
  };
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-bold",
        map[status] ?? "bg-secondary text-muted-foreground",
      )}
    >
      {label[status] ?? status}
    </span>
  );
}
