import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { deleteCard, getCardById, updateCard } from "@/lib/db";
import type { CardInput } from "@/lib/types";
import { DEFAULT_THEME } from "@/lib/types";
import { normalizeImageTransition } from "@/lib/transitions";

type Params = { params: Promise<{ id: string }> };

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

export async function GET(_request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const card = await getCardById(id);
  if (!card || card.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ card });
}

export async function PUT(request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  try {
    const body = await request.json();
    const data = normalizeCardInput(body);
    if ("error" in data) {
      return NextResponse.json({ error: data.error }, { status: 400 });
    }
    const card = await updateCard(id, user.id, data);
    if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ card });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not update card" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const ok = await deleteCard(id, user.id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
