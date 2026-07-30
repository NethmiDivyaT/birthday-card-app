import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getSessionUser } from "@/lib/auth";
import { insertCard, listCardsForUser } from "@/lib/db";
import type { CardInput } from "@/lib/types";
import { DEFAULT_THEME } from "@/lib/types";
import { normalizeImageTransition } from "@/lib/transitions";

function normalizeCardInput(raw: Partial<CardInput>): CardInput | { error: string } {
  const recipientName = String(raw.recipientName ?? "").trim();
  if (!recipientName) return { error: "Recipient name is required" };

  const senderName = String(raw.senderName ?? "").trim();
  if (!senderName) return { error: "Sender name is required" };

  const title = String(raw.title ?? "Happy Birthday!").trim() || "Happy Birthday!";
  const message = String(raw.message ?? "").trim();
  if (!message) return { error: "Message is required" };

  return {
    recipientName,
    recipientEmail: raw.recipientEmail ? String(raw.recipientEmail).trim() : "",
    recipientPhone: raw.recipientPhone ? String(raw.recipientPhone).trim() : "",
    senderName,
    title,
    message,
    theme: { ...DEFAULT_THEME, ...(raw.theme ?? {}) },
    images: Array.isArray(raw.images) ? raw.images.filter((x) => typeof x === "string").slice(0, 8) : [],
    videoUrl: raw.videoUrl ? String(raw.videoUrl) : null,
    imageTransition: normalizeImageTransition(raw.imageTransition),
    musicEnabled: raw.musicEnabled !== false,
  };
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const cards = await listCardsForUser(user.id);
  return NextResponse.json({ cards });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();

    // Batch create: { recipients: CardInput[] } with shared media/theme optional
    if (Array.isArray(body.recipients)) {
      if (body.recipients.length === 0) {
        return NextResponse.json({ error: "Add at least one recipient" }, { status: 400 });
      }
      if (body.recipients.length > 25) {
        return NextResponse.json({ error: "Maximum 25 recipients per batch" }, { status: 400 });
      }

      const created = [];
      for (const item of body.recipients) {
        const shared = body.shared ?? {};
        const merged: Partial<CardInput> = {
          ...shared,
          ...item,
          theme: { ...(shared.theme ?? {}), ...(item.theme ?? {}) },
          images: item.images ?? shared.images ?? [],
          videoUrl: item.videoUrl ?? shared.videoUrl ?? null,
          imageTransition: item.imageTransition ?? shared.imageTransition ?? "fade",
          musicEnabled: item.musicEnabled ?? shared.musicEnabled ?? true,
          senderName: item.senderName ?? shared.senderName ?? user.name,
        };
        const data = normalizeCardInput(merged);
        if ("error" in data) {
          return NextResponse.json({ error: data.error }, { status: 400 });
        }
        const card = await insertCard({
          id: nanoid(),
          userId: user.id,
          shareToken: nanoid(12),
          data,
        });
        created.push(card);
      }
      return NextResponse.json({ cards: created }, { status: 201 });
    }

    const data = normalizeCardInput({
      ...body,
      senderName: body.senderName ?? user.name,
    });
    if ("error" in data) {
      return NextResponse.json({ error: data.error }, { status: 400 });
    }

    const card = await insertCard({
      id: nanoid(),
      userId: user.id,
      shareToken: nanoid(12),
      data,
    });
    return NextResponse.json({ card }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not create card" }, { status: 500 });
  }
}
