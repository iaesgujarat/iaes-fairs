import * as React from "react";
import { MailerLayout, CTA_BUTTON_STYLE } from "./_layout";

interface Props {
  recipientName: string;
  universityName: string;
  fairName: string;
  fairDateRange: string;
  studentsVisited: number;
  studentsInterested: number;
  portalUrl: string;
  portalExpiresOn: string;
}

export function PostfairDataEmail({
  recipientName,
  universityName,
  fairName,
  fairDateRange,
  studentsVisited,
  studentsInterested,
  portalUrl,
  portalExpiresOn,
}: Props) {
  return (
    <MailerLayout
      preheader={`Your student data from the ${fairName}.`}
      eyebrow="Post-Fair Data"
      title={`Your student leads — ${fairName}`}
    >
      <p style={{ margin: 0, fontSize: 16 }}>Dear {recipientName},</p>
      <p style={{ marginTop: 14, lineHeight: 1.6 }}>
        Thank you for participating in the {fairName} ({fairDateRange}). Here is
        a summary of <strong>{universityName}</strong>&rsquo;s booth engagement.
      </p>

      <table
        width="100%"
        style={{
          marginTop: 20,
          borderTop: "1px solid #E1E6EF",
          borderBottom: "1px solid #E1E6EF",
        }}
      >
        <tbody>
          <Row label="Students who visited your booth" value={`${studentsVisited}`} />
          <Row label="Students marked as Interested" value={`${studentsInterested}`} />
          <Row label="Portal access valid until" value={portalExpiresOn} />
        </tbody>
      </table>

      <p style={{ marginTop: 18, lineHeight: 1.6 }}>
        Your complete student contact list (filtered by student consent) is
        attached as a CSV file. The same data is available on your private
        portal — bookmark this link, no login required:
      </p>

      <div style={{ textAlign: "center", marginTop: 24 }}>
        <a href={portalUrl} style={CTA_BUTTON_STYLE}>
          Open My Portal &rarr;
        </a>
      </div>

      <p
        style={{
          marginTop: 22,
          padding: 12,
          backgroundColor: "#F5F7FA",
          borderRadius: 6,
          fontSize: 13,
          color: "#3A5A94",
        }}
      >
        Please use this data only for legitimate admissions and advisory
        communications, as per our T&amp;C §12.
      </p>

      <p style={{ marginTop: 22, lineHeight: 1.6 }}>
        Thank you for being part of the {fairName}.
        <br />
        <strong>IAES Team</strong>
      </p>
    </MailerLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td style={{ padding: "10px 0", color: "#6F7B8F", fontSize: 13 }}>
        {label}
      </td>
      <td
        style={{
          padding: "10px 0",
          textAlign: "right",
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        {value}
      </td>
    </tr>
  );
}
