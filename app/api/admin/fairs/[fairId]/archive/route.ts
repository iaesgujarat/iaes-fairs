import { runTransition } from "@/lib/fairTransitions";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: { fairId: string } }
) {
  return runTransition({
    fairId: params.fairId,
    toStatus: "ARCHIVED",
    patch: { is_active: false },
    note: "Fair archived.",
  });
}
