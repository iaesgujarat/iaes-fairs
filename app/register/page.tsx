import { redirect } from "next/navigation";

/**
 * Legacy /register URL — redirect to the dual-CTA landing section so
 * visitors with old links / cached emails choose university vs.
 * institution explicitly.
 */
export default function RegisterRedirect() {
  redirect("/#register");
}
