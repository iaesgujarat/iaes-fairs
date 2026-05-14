import * as React from "react";
import { cn } from "@/lib/utils";
import type { RegistrationStatus } from "@/types";

type BadgeVariant =
  | "default"
  | "yellow"
  | "blue"
  | "purple"
  | "green"
  | "red"
  | "navy"
  | "gold";

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-cream text-navy border-navy/15",
  yellow: "bg-amber-50 text-amber-800 border-amber-200",
  blue: "bg-blue-50 text-blue-800 border-blue-200",
  purple: "bg-purple-50 text-purple-800 border-purple-200",
  green: "bg-emerald-50 text-emerald-800 border-emerald-200",
  red: "bg-red-50 text-red-800 border-red-200",
  navy: "bg-navy text-white border-navy",
  gold: "bg-gold/15 text-gold-700 border-gold/30",
};

export function Badge({
  variant = "default",
  className,
  children,
}: {
  variant?: BadgeVariant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: RegistrationStatus }) {
  const map: Record<RegistrationStatus, { variant: BadgeVariant; label: string }> = {
    pending: { variant: "yellow", label: "Pending" },
    invoice_sent: { variant: "blue", label: "Invoice Sent" },
    paid: { variant: "purple", label: "Paid" },
    confirmed: { variant: "green", label: "Confirmed" },
    cancelled: { variant: "red", label: "Cancelled" },
  };
  const { variant, label } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}
