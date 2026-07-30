"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BirthdayCard } from "@/lib/types";
import { ShareButtons } from "./ShareButtons";

type Props = {
  card: BirthdayCard;
  origin: string;
};

export function DashboardCardItem({ card, origin }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm(`Delete card for ${card.recipientName}?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/cards/${card.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Delete failed");
      }
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="card-item">
      <div>
        <h3>{card.recipientName}</h3>
        <p className="meta">{card.title}</p>
        <p className="meta" suppressHydrationWarning>
          Updated {new Date(card.updatedAt).toISOString().slice(0, 16).replace("T", " ")} UTC · token{" "}
          {card.shareToken}
        </p>
        <div className="actions-row" style={{ marginTop: "0.75rem" }}>
          <Link className="btn btn-ghost" href={`/dashboard/cards/${card.id}`}>
            Edit
          </Link>
          <button type="button" className="btn btn-ghost danger" disabled={busy} onClick={() => void remove()}>
            Delete
          </button>
        </div>
      </div>
      <ShareButtons card={card} origin={origin} />
    </article>
  );
}
