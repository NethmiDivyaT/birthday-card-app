import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getCardById } from "@/lib/db";
import { CardEditor } from "@/components/CardEditor";

type Props = { params: Promise<{ id: string }> };

export default async function EditCardPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const card = await getCardById(id);
  if (!card || card.userId !== user.id) notFound();

  return (
    <main className="page">
      <h1 className="page-title">Edit card for {card.recipientName}</h1>
      <CardEditor
        senderName={user.name}
        mode="edit"
        cardId={card.id}
        initial={{
          recipientName: card.recipientName,
          recipientEmail: card.recipientEmail ?? "",
          recipientPhone: card.recipientPhone ?? "",
          senderName: card.senderName,
          title: card.title,
          message: card.message,
          theme: card.theme,
          images: card.images,
          videoUrl: card.videoUrl,
          imageTransition: card.imageTransition,
          musicEnabled: card.musicEnabled,
        }}
      />
    </main>
  );
}
