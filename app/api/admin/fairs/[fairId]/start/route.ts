import { runTransition } from "@/lib/fairTransitions";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: { fairId: string } }
) {
  return runTransition({
    fairId: params.fairId,
    toStatus: "ONGOING",
    patch: {
      started_at: new Date().toISOString(),
      // is_active remains true so the public page shows the live banner
      // and the /scan flow keeps working.
    },
    note: "Fair started — QR scanning is live.",
  });
}
