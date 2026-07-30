import type { BirthdayCard } from "./types";

export function cardPublicUrl(origin: string, token: string) {
  return `${origin.replace(/\/$/, "")}/c/${token}`;
}

export function whatsappShareUrl(card: BirthdayCard, link: string) {
  const text = `Happy Birthday ${card.recipientName}! 🎂 Open your special card: ${link}`;
  const phone = card.recipientPhone?.replace(/[^\d+]/g, "") ?? "";
  if (phone) {
    const digits = phone.replace(/\D/g, "");
    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  }
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function emailShareUrl(card: BirthdayCard, link: string) {
  const subject = encodeURIComponent(`${card.title} — a birthday card for you`);
  const body = encodeURIComponent(
    `Hi ${card.recipientName},\n\n${card.senderName} sent you a birthday card!\n\nOpen it here:\n${link}\n\n`,
  );
  const to = card.recipientEmail ? encodeURIComponent(card.recipientEmail) : "";
  return `mailto:${to}?subject=${subject}&body=${body}`;
}
