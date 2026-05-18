import * as React from "react";
import { MailerLayout } from "./_layout";

interface Props {
  recipientName: string;
  universityName: string;
  fairName: string;
  cancellationReason: string;
  /** Pre-formatted refund line, e.g. "Refund: 50% of base fee, processed within 30 business days". */
  refundLine: string;
}

export function FairCancellationEmail({
  recipientName,
  universityName,
  fairName,
  cancellationReason,
  refundLine,
}: Props) {
  return (
    <MailerLayout
      preheader={`Important notice about ${fairName}.`}
      eyebrow="Important Notice"
      title={`${fairName} — Cancelled`}
    >
      <p style={{ margin: 0, fontSize: 16 }}>Dear {recipientName},</p>
      <p style={{ marginTop: 14, lineHeight: 1.6 }}>
        We regret to inform you that the {fairName} has been{" "}
        <strong>cancelled</strong>. We sincerely apologise to you and the team
        at <strong>{universityName}</strong> for the inconvenience.
      </p>

      <p
        style={{
          marginTop: 14,
          padding: 12,
          backgroundColor: "#F5F7FA",
          borderLeft: "4px solid #C9A227",
          fontSize: 13,
          color: "#0B2B5C",
        }}
      >
        <strong>Reason:</strong> {cancellationReason}
      </p>

      <p style={{ marginTop: 18, lineHeight: 1.6 }}>
        Your registration fee will be refunded as per our cancellation policy.
      </p>
      <p style={{ marginTop: 8, lineHeight: 1.6 }}>
        <strong>{refundLine}</strong>
      </p>

      <p
        style={{
          marginTop: 22,
          padding: 12,
          backgroundColor: "#FEF3C7",
          color: "#92400E",
          fontSize: 13,
          borderRadius: 6,
        }}
      >
        Note: GST amounts are non-refundable as they are remitted to the
        government upon invoice issuance (T&amp;C §7.5).
      </p>

      <p style={{ marginTop: 22, lineHeight: 1.6 }}>
        For questions, reach us at{" "}
        <a
          href="mailto:eduadviser@iaesgujarat.org"
          style={{ color: "#0B2B5C" }}
        >
          eduadviser@iaesgujarat.org
        </a>{" "}
        or +91 97264 80899.
      </p>

      <p style={{ marginTop: 22, lineHeight: 1.6 }}>
        <strong>IAES Team</strong>
      </p>
    </MailerLayout>
  );
}
