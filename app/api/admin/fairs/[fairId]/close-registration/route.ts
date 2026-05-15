import { runTransition } from "@/lib/fairTransitions";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: { fairId: string } }
) {
  return runTransition({
    fairId: params.fairId,
    toStatus: "REGISTRATION_CLOSED",
    patch: {
      registration_closed_at: new Date().toISOString(),
      // is_active stays true so the fair page still renders the
      // "registration closed" variant per v6 §14.
    },
    note: "Registration closed.",
  });
}
