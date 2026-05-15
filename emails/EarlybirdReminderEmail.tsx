import * as React from "react";
import { MailerLayout, CTA_BUTTON_STYLE } from "./_layout";

interface Props {
  recipientName: string | null;
  fairName: string;
  earlybirdDeadline: string;
  earlybirdUSD: number;
  standardUSD: number;
  registerUrl: string;
}

export function EarlybirdReminderEmail({
  recipientName,
  fairName,
  earlybirdDeadline,
  earlybirdUSD,
  standardUSD,
  registerUrl,
}: Props) {
  const saving = Math.max(standardUSD - earlybirdUSD, 0);
  return (
    <MailerLayout
      preheader={`Early bird ends ${earlybirdDeadline}.`}
      eyebrow="Early Bird Reminder"
      title={`Early Bird ends soon — ${fairName}`}
    >
      <p style={{ margin: 0, fontSize: 16 }}>
        Dear {recipientName || "Colleague"},
      </p>
      <p style={{ marginTop: 14, lineHeight: 1.6 }}>
        The Early Bird rate of <strong>USD {earlybirdUSD.toLocaleString()}</strong>{" "}
        for the {fairName} ends on <strong>{earlybirdDeadline}</strong>.
      </p>
      <p style={{ marginTop: 10, lineHeight: 1.6 }}>
        After this date, the standard rate of USD{" "}
        {standardUSD.toLocaleString()} applies.
        {saving > 0 && (
          <>
            {" "}
            <span style={{ color: "#0F8F4F", fontWeight: 600 }}>
              Save USD {saving}
            </span>{" "}
            by registering today.
          </>
        )}
      </p>

      <div style={{ textAlign: "center", marginTop: 28 }}>
        <a href={registerUrl} style={CTA_BUTTON_STYLE}>
          Register at Early Bird Rate &rarr;
        </a>
      </div>

      <p style={{ marginTop: 28, lineHeight: 1.6 }}>
        IAES Team
      </p>
    </MailerLayout>
  );
}
