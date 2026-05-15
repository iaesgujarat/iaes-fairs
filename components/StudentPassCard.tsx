"use client";

import QRCode from "react-qr-code";

interface Props {
  scanUrl: string;
  fullName: string;
  institutionName: string;
  currentCourse: string | null;
  currentSemester: string | null;
  passNumber: string;
}

export function StudentPassCard({
  scanUrl,
  fullName,
  institutionName,
  currentCourse,
  currentSemester,
  passNumber,
}: Props) {
  return (
    <div className="mt-10 w-full rounded-2xl bg-white p-6 text-navy shadow-2xl">
      <div className="mx-auto w-fit rounded-xl bg-white p-4 shadow-inner">
        <QRCode
          value={scanUrl}
          size={240}
          bgColor="#FFFFFF"
          fgColor="#0B2B5C"
        />
      </div>

      <div className="mt-6 text-center">
        <p className="font-serif text-xl font-semibold text-navy">{fullName}</p>
        <p className="mt-1 text-sm text-navy/70">{institutionName}</p>
        {(currentCourse || currentSemester) && (
          <p className="mt-1 text-xs text-navy/55">
            {[currentCourse, currentSemester].filter(Boolean).join(" · ")}
          </p>
        )}

        <div className="mx-auto mt-5 inline-block rounded-md border border-dashed border-navy/30 px-4 py-1.5">
          <p className="text-[10px] uppercase tracking-wider text-navy/50">
            Pass No.
          </p>
          <p className="font-mono text-sm font-semibold tracking-wide text-navy">
            {passNumber}
          </p>
        </div>
      </div>
    </div>
  );
}
