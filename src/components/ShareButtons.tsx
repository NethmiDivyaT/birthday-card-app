"use client";

import type { BirthdayCard } from "@/lib/types";
import { emailShareUrl, whatsappShareUrl } from "@/lib/share";

type Props = {
  card: BirthdayCard;
  origin: string;
};

export function ShareButtons({ card, origin }: Props) {
  const link = `${origin.replace(/\/$/, "")}/c/${card.shareToken}`;
  const wa = whatsappShareUrl(card, link);
  const mail = emailShareUrl(card, link);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      alert("Link copied!");
    } catch {
      prompt("Copy this link:", link);
    }
  }

  return (
    <div className="share-row">
      <a className="btn btn-whatsapp" href={wa} target="_blank" rel="noreferrer">
        WhatsApp
      </a>
      <a className="btn btn-email" href={mail}>
        Email
      </a>
      <button type="button" className="btn btn-ghost" onClick={copyLink}>
        Copy link
      </button>
      <a className="btn btn-ghost" href={link} target="_blank" rel="noreferrer">
        Preview
      </a>
    </div>
  );
}
