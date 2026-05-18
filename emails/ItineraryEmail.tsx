import * as React from "react";
import { MailerLayout } from "./_layout";

interface Props {
  recipientName: string;
  universityName: string;
  invoiceNumber: string;
  fairName: string;
  fairDateRange: string;
  venue: string;
  arriveBy: string | null;
  departAfter: string | null;
  /** Itinerary lines (one per day or per item). */
  itinerary: { date: string; details: string }[];
  boardingPoint: string;
  pickupTime: string;
  /** Materials shipping address + deadline. */
  shipping: {
    address: string;
    deadline: string;
    labelTemplate: string;
  };
}

export function ItineraryEmail({
  recipientName,
  universityName,
  invoiceNumber,
  fairName,
  fairDateRange,
  venue,
  arriveBy,
  departAfter,
  itinerary,
  boardingPoint,
  pickupTime,
  shipping,
}: Props) {
  return (
    <MailerLayout
      preheader={`Briefing pack for ${fairName}.`}
      eyebrow="Itinerary & Briefing"
      title={`Fair briefing — ${fairName}`}
    >
      <p style={{ margin: 0, fontSize: 16 }}>Dear {recipientName},</p>
      <p style={{ marginTop: 14, lineHeight: 1.6 }}>
        We&rsquo;re excited to welcome <strong>{universityName}</strong> to the{" "}
        {fairName}. Please find your confirmed briefing pack below.
      </p>

      <SectionHeader>Your Booking</SectionHeader>
      <table width="100%">
        <tbody>
          <Row label="Invoice" value={invoiceNumber} />
          <Row label="Fair Dates" value={fairDateRange} />
          <Row label="Venue" value={venue} />
          {arriveBy && <Row label="Arrive by" value={arriveBy} />}
          {departAfter && <Row label="Depart after" value={departAfter} />}
        </tbody>
      </table>

      <SectionHeader>Itinerary</SectionHeader>
      <ul
        style={{
          paddingLeft: 18,
          margin: 0,
          fontSize: 14,
          lineHeight: 1.7,
          color: "#0B2B5C",
        }}
      >
        {itinerary.map((it, i) => (
          <li key={i}>
            <strong>{it.date}:</strong> {it.details}
          </li>
        ))}
      </ul>

      <SectionHeader>Pickup</SectionHeader>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>
        <strong>Boarding point:</strong> {boardingPoint}
        <br />
        <strong>Pickup time:</strong> {pickupTime}
      </p>

      <SectionHeader>Materials Shipping</SectionHeader>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>
        Ship to:
        <br />
        {shipping.address}
        <br />
        <strong>Deadline:</strong> {shipping.deadline}
        <br />
        <strong>Label:</strong> {shipping.labelTemplate}
      </p>

      <p
        style={{
          marginTop: 24,
          padding: 12,
          backgroundColor: "#F5F7FA",
          borderRadius: 6,
          fontSize: 13,
          color: "#3A5A94",
        }}
      >
        For day-of help: <strong>+91 97264 80899</strong> ·
        eduadviser@iaesgujarat.org
      </p>

      <p style={{ marginTop: 24, lineHeight: 1.6 }}>
        See you in Ahmedabad!
        <br />
        <strong>IAES Team</strong>
      </p>
    </MailerLayout>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        marginTop: 24,
        marginBottom: 8,
        fontSize: 12,
        letterSpacing: 1,
        textTransform: "uppercase",
        color: "#6F7B8F",
      }}
    >
      {children}
    </p>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td
        style={{
          padding: "8px 0",
          color: "#6F7B8F",
          fontSize: 13,
          width: "40%",
        }}
      >
        {label}
      </td>
      <td style={{ padding: "8px 0", fontWeight: 600, fontSize: 14 }}>
        {value}
      </td>
    </tr>
  );
}
