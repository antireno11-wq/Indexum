import type { ReactNode } from "react";

type SectionCardProps = {
  children: ReactNode;
  className?: string;
};

export function SectionCard({ children, className = "" }: SectionCardProps) {
  return (
    <section
      className={`rounded-[28px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)] backdrop-blur-sm ${className}`}
    >
      {children}
    </section>
  );
}
