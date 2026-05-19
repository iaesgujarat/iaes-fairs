import { notFound } from "next/navigation";
import { FairLanding } from "@/components/FairLanding";
import { getFairById } from "@/lib/fair";

export const revalidate = 60;

interface Props {
  params: { fairId: string };
}

export default async function FairDetailPage({ params }: Props) {
  const fair = await getFairById(params.fairId);

  // Unknown id, or a not-yet-public DRAFT → 404. Terminal/active
  // statuses still render: FairLanding already status-gates its
  // banners and CTAs (e.g. a concluded fair shows "Fair Programme").
  if (!fair || (fair.status ?? "PUBLISHED") === "DRAFT") {
    notFound();
  }

  return <FairLanding fair={fair} />;
}

export async function generateMetadata({ params }: Props) {
  const fair = await getFairById(params.fairId);
  return {
    title: fair
      ? `${fair.name} · IAES International Education Fairs`
      : "Fair not found · IAES International Education Fairs",
  };
}
