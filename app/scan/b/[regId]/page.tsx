import { redirect } from "next/navigation";

/**
 * Clean path form of the pre-bound booth scan link, used as the WhatsApp
 * template's dynamic URL button (a path suffix validates more reliably
 * than a query string). Redirects to /scan?b=<regId>, which auto-binds
 * the booth on the device.
 */
export default function ScanBoothRedirect({
  params,
}: {
  params: { regId: string };
}) {
  redirect(`/scan?b=${encodeURIComponent(params.regId)}`);
}
