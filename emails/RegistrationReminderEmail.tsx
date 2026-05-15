import * as React from "react";
import { MailerLayout, CTA_BUTTON_STYLE } from "./_layout";

interface Props {
  recipientName: string | null;
  fairName: string;
  registrationDeadline: string;
  spotsRemaining: number | null;
  maxUniversities: number | null;
  registerUrl: string;
}

export function RegistrationReminderEmail({
  recipientName,
  fairName,
  registrationDeadline,
  spotsRemaining,
  maxUniversities,
  registerUrl,
}: Props) {
  return (
    <MailerLayout
      preheader={`Registration closes ${registrationDeadline}.`}
      eyebrow="Registration Reminder"
      title={`Registration closes soon — ${fairName}`}
    >
      <p style={{ margin: 0, fontSize: 16 }}>
        Dear {recipientName || "Colleague"},
      </p>
      <p style={{ marginTop: 14, lineHeight: 1.6 }}>
        This is a friendly reminder that registration for the {fairName} closes
        on <strong>{registrationDeadline}</strong>.
      </p>

      {spotsRemaining != null && maxUniversities != null && (
        <p style={{ marginTop: 10, lineHeight: 1.6 }}>
          <strong>{spotsRemaining}</strong> of {maxUniversities} university
          spots remain.
        </p>
      )}

      <div style={{ textAlign: "center", marginTop: 28 }}>
        <a href={registerUrl} style={CTA_BUTTON_STYLE}>
          Register Now &rarr;
        </a>
      </div>

      <p style={{ marginTop: 28, lineHeight: 1.6 }}>
        IAES Team
      </p>
    </MailerLayout>
  );
}
