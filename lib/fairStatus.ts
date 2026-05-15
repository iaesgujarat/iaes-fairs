import type { FairStatus } from "@/types";

/**
 * Allowed forward transitions. CANCELLED can be reached from any
 * non-terminal state; that exception is handled in {@link canTransition}.
 */
const FORWARD: Record<FairStatus, FairStatus[]> = {
  DRAFT: ["PUBLISHED"],
  PUBLISHED: ["REGISTRATION_CLOSED", "ONGOING"],
  REGISTRATION_CLOSED: ["ONGOING"],
  ONGOING: ["COMPLETED"],
  COMPLETED: ["ARCHIVED"],
  ARCHIVED: [],
  CANCELLED: [],
};

const CANCELLABLE_FROM: FairStatus[] = [
  "DRAFT",
  "PUBLISHED",
  "REGISTRATION_CLOSED",
  "ONGOING",
];

export function canTransition(from: FairStatus, to: FairStatus): boolean {
  if (to === "CANCELLED") return CANCELLABLE_FROM.includes(from);
  return FORWARD[from]?.includes(to) ?? false;
}

export const STATUS_LABELS: Record<FairStatus, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  REGISTRATION_CLOSED: "Registration Closed",
  ONGOING: "Ongoing",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
  CANCELLED: "Cancelled",
};

/**
 * Whether the public landing page should treat the fair as "open for
 * university and institution registrations". (Student walk-ins are
 * also allowed during ONGOING — see {@link isStudentPassOpen}.)
 */
export function isRegistrationOpen(status: FairStatus | undefined): boolean {
  return status === "PUBLISHED";
}

export function isStudentPassOpen(status: FairStatus | undefined): boolean {
  return status === "PUBLISHED" || status === "ONGOING";
}
