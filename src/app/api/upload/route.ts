import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { put } from "@vercel/blob";
import { nanoid } from "nanoid";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_IMAGE = 4.5 * 1024 * 1024;
const MAX_VIDEO = 40 * 1024 * 1024;

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

function isVercel() {
  return process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV);
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const form = await request.formData();
    const file = form.get("file");
    const kind = String(form.get("kind") ?? "image");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    if (kind === "video") {
      if (!VIDEO_TYPES.has(file.type)) {
        return NextResponse.json({ error: "Use MP4, WebM, or MOV video" }, { status: 400 });
      }
      if (file.size > MAX_VIDEO) {
        return NextResponse.json({ error: "Video must be under 40MB" }, { status: 400 });
      }
    } else {
      if (!IMAGE_TYPES.has(file.type)) {
        return NextResponse.json({ error: "Use JPG, PNG, WEBP, or GIF" }, { status: 400 });
      }
      if (file.size > MAX_IMAGE) {
        return NextResponse.json({ error: "Image must be under 4.5MB" }, { status: 400 });
      }
    }

    const ext =
      file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
      (kind === "video" ? "mp4" : "jpg");
    const filename = `wishlink/${user.id}/${nanoid()}.${ext}`;

    // Production (Vercel): persistent cloud storage
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(filename, file, {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
        contentType: file.type || undefined,
        addRandomSuffix: false,
      });
      return NextResponse.json({ url: blob.url });
    }

    if (isVercel()) {
      return NextResponse.json(
        {
          error:
            "Uploads are not configured. Add a Vercel Blob store and set BLOB_READ_WRITE_TOKEN, then redeploy.",
        },
        { status: 503 },
      );
    }

    // Local development: write into public/uploads
    const localName = `${nanoid()}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, localName), buffer);
    return NextResponse.json({ url: `/uploads/${localName}` });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message || "Upload failed" }, { status: 500 });
  }
}
