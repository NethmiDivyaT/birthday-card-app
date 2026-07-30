import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { CardEditor } from "@/components/CardEditor";

export default async function NewCardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <main className="page">
      <h1 className="page-title">Create birthday cards</h1>
      <p className="hint">
        Add one or many recipients. Shared photos/video apply to the batch; each person can have
        their own message, theme colors, and contact details for sharing.
      </p>
      <CardEditor senderName={user.name} mode="create" />
    </main>
  );
}
