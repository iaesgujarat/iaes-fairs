import * as React from "react";
import { MailerLayout, CTA_BUTTON_STYLE } from "./_layout";

interface Props {
  recipientName: string | null;
  fairName: string;
  fairDateRange: string;
  city: string;
  hostCities?: string;
  standardUSD: number;
  earlybirdUSD: number | null;
  earlybirdDeadline: string | null;
  registrationDeadline: string;
  registerUrl: string;
}

export function FairAnnouncementEmail({
  recipientName,
  fairName,
  fairDateRange,
  city,
  hostCities,
  standardUSD,
  earlybirdUSD,
  earlybirdDeadline,
  registrationDeadline,
  registerUrl,
}: Props) {
  return (
    <MailerLayout
      preheader={`Registration is now open for ${fairName}.`}
      eyebrow="Education Fair Announcement"
      title={`Registration now open — ${fairName}`}
    >
      <p style={{ margin: 0, fontSize: 16 }}>
        Dear {recipientName || "Colleague"},
      </p>
      <p style={{ marginTop: 14, lineHeight: 1.6 }}>
        We are pleased to announce the <strong>{fairName}</strong>.
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
          <Row label="Dates" value={fairDateRange} />
          <Row label="City" value={city} />
          {hostCities && <Row label="Visits" value={hostCities} />}
        </tbody>
      </table>

      <p
        style={{
          marginTop: 22,
          marginBottom: 6,
          fontSize: 12,
          letterSpacing: 1,
          textTransform: "uppercase",
          color: "#6F7B8F",
        }}
      >
        Registration Fee
      </p>
      {earlybirdUSD && earlybirdDeadline ? (
        <>
          <p style={{ margin: 0, fontSize: 16 }}>
            ⭐ <strong>Early Bird: USD {earlybirdUSD.toLocaleString()}</strong>{" "}
            <span style={{ fontSize: 12, color: "#6F7B8F" }}>
              (before {earlybirdDeadline})
            </span>
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 14 }}>
            Standard: USD {standardUSD.toLocaleString()}
          </p>
        </>
      ) : (
        <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
          USD {standardUSD.toLocaleString()}
        </p>
      )}

      <p style={{ marginTop: 18, lineHeight: 1.6 }}>
        Fee includes travel to institute visits and meals during all days.
        Registration closes <strong>{registrationDeadline}</strong>. Spots are
        limited.
      </p>

      <div style={{ textAlign: "center", marginTop: 28 }}>
        <a href={registerUrl} style={CTA_BUTTON_STYLE}>
          Register Now &rarr;
        </a>
      </div>

      <p style={{ marginTop: 24, lineHeight: 1.6 }}>
        Looking forward to hosting you.
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
