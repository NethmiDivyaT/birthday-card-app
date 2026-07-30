import { notFound } from "next/navigation";
import { getCardByToken } from "@/lib/db";
import { CardViewer } from "@/components/CardViewer";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props) {
  const { token } = await params;
  const card = await getCardByToken(token);
  if (!card) return { title: "Card not found" };
  return {
    title: `${card.title} — for ${card.recipientName}`,
    description: card.message.slice(0, 140),
  };
}

export default async function PublicCardPage({ params }: Props) {
  const { token } = await params;
  const card = await getCardByToken(token);
  if (!card) notFound();

  return (
    <main className="viewer-page">
      <CardViewer card={card} />
    </main>
  );
}
