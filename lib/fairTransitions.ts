import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdmin } from "@/lib/admin";
import { canTransition } from "@/lib/fairStatus";
import type { FairStatus } from "@/types";

interface TransitionOptions {
  fairId: string;
  toStatus: FairStatus;
  /** Extra columns to set on the fair row (e.g. timestamps). */
  patch?: Record<string, unknown>;
  /** Optional note written into fair_status_log.note. */
  note?: string;
  /** If false, skip the canTransition() check (used by /cancel). */
  enforceForward?: boolean;
}

/**
 * Shared "run an admin-authenticated fair status transition" workflow.
 *   1. Auth-check the caller.
 *   2. Load the fair, verify the transition is allowed.
 *   3. Update the row (status + patch).
 *   4. Append to fair_status_log.
 *   5. Return a Response — either error JSON or a success JSON.
 */
export async function runTransition(
  options: TransitionOptions
): Promise<Response> {
  const admin = await assertAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: fair } = await supabase
    .from("fairs")
    .select("id, status")
    .eq("id", options.fairId)
    .maybeSingle();
  if (!fair) {
    return NextResponse.json({ error: "Fair not found." }, { status: 404 });
  }

  const from = (fair.status as FairStatus | undefined) ?? "DRAFT";
  const enforce = options.enforceForward ?? true;
  if (enforce && !canTransition(from, options.toStatus)) {
    return NextResponse.json(
      { error: `Cannot transition from ${from} to ${options.toStatus}.` },
      { status: 409 }
    );
  }

  const update: Record<string, unknown> = {
    status: options.toStatus,
    ...(options.patch || {}),
  };

  const { error: updErr } = await supabase
    .from("fairs")
    .update(update)
    .eq("id", options.fairId);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  await supabase.from("fair_status_log").insert({
    fair_id: options.fairId,
    from_status: from,
    to_status: options.toStatus,
    changed_by: admin.email,
    note: options.note || null,
  });

  return NextResponse.json({ success: true, status: options.toStatus });
}
