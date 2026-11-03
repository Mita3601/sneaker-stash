import { Link } from "@tanstack/react-router";
import { ChevronLeft, Info } from "lucide-react";

export const financeButton =
  "finance-button min-h-14 rounded-md text-base font-bold normal-case tracking-normal shadow-card";
export const financeInput =
  "h-12 w-full min-w-0 rounded-lg bg-secondary px-4 text-base outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring";

export function FinanceHeader({ title, info }: { title: string; info?: string }) {
  return (
    <header className="finance-header sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-black/5 bg-[#e8e8e8] px-3 text-[#1a1a1a]">
      <Link
        to="/app/me"
        aria-label="Retour à mon compte"
        className="grid size-8 shrink-0 place-items-center text-[#1a1a1a]"
      >
        <ChevronLeft className="size-6" />
      </Link>
      <h1 className={`flex-1 font-sans text-[18px] font-bold ${info ? "" : "pr-8 text-center"}`}>
        {title}
      </h1>
      {info && (
        <a
          href={`#${info}`}
          aria-label={`Instructions : ${title}`}
          className="grid size-8 place-items-center rounded-full bg-[#1d1d1d] text-white"
        >
          <Info className="size-5" />
        </a>
      )}
    </header>
  );
}
