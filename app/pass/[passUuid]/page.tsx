import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { StudentPassCard } from "@/components/StudentPassCard";
import { InstallHint } from "@/components/InstallHint";
import type { Fair, FairStudentPass } from "@/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Your Fair Pass — IAES",
  robots: "noindex,nofollow",
};

function fairDateLabel(fair: Fair): string {
  const start = fair.fair_date_start || fair.fair_date;
  const end = fair.fair_date_end;
  if (!end || end === start) {
    return new Date(start).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  const startD = new Date(start);
  const endD = new Date(end);
  const sameMonth =
    startD.getMonth() === endD.getMonth() &&
    startD.getFullYear() === endD.getFullYear();
  if (sameMonth) {
    return `${startD.getDate()}–${endD.getDate()} ${endD.toLocaleDateString(
      "en-IN",
      { month: "long", year: "numeric" }
    )}`;
  }
  return `${startD.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
  })} – ${endD.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })}`;
}

export default async function StudentPassPage({
  params,
}: {
  params: { passUuid: string };
}) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("fair_student_passes")
    .select(`*, fair:fairs(*)`)
    .eq("pass_uuid", params.passUuid)
    .maybeSingle();

  if (!data) notFound();

  const pass = data as FairStudentPass & { fair: Fair };

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://fairs.iaesgujarat.org";
  const scanUrl = `${appUrl}/scan/${pass.pass_uuid}`;

  return (
    <main className="min-h-screen bg-navy text-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-start px-6 py-10">
        <div className="text-center">
          <p className="font-serif text-2xl font-semibold text-white">IAES</p>
          <p className="mt-0.5 text-xs uppercase tracking-[0.18em] text-gold">
            Education Fair 2026
          </p>
          <p className="mt-2 text-sm text-white/70">
            {fairDateLabel(pass.fair)} · {pass.fair.city}
          </p>
        </div>

        <StudentPassCard
          scanUrl={scanUrl}
          fullName={pass.full_name}
          institutionName={pass.institution_name}
          currentCourse={pass.current_course}
          currentSemester={pass.current_semester}
          passNumber={pass.pass_number}
        />

        <p className="mt-8 text-center text-xs text-white/55">
          Show this to university reps at each booth.
          <br />
          They&rsquo;ll scan it to see your profile.
        </p>
      </div>
      <InstallHint />
    </main>
  );
}
