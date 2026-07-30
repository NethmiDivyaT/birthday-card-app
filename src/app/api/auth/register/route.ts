import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { createUser, getUserByEmail } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (name.length < 2) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const existing = await getUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = await createUser({
      id: nanoid(),
      name,
      email,
      passwordHash,
    });
    await createSession(user.id);
    return NextResponse.json({ user });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Registration failed";
    const isConfig = message.includes("TURSO_") || message.includes("Vercel");
    return NextResponse.json(
      { error: isConfig ? message : "Registration failed" },
      { status: 500 },
    );
  }
}
