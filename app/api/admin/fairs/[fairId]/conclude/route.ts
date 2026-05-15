import { runTransition } from "@/lib/fairTransitions";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: { fairId: string } }
) {
  return runTransition({
    fairId: params.fairId,
    toStatus: "COMPLETED",
    patch: {
      concluded_at: new Date().toISOString(),
      is_active: false, // public landing now shows the "concluded" page
    },
    note: "Fair concluded — registrations locked.",
  });
}
