import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";
import { getSessionUser } from "@/lib/auth";

const MAX_IMAGE = 5 * 1024 * 1024;
const MAX_VIDEO = 40 * 1024 * 1024;

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

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
        return NextResponse.json({ error: "Image must be under 5MB" }, { status: 400 });
      }
    }

    const ext =
      file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
      (kind === "video" ? "mp4" : "jpg");
    const filename = `${nanoid()}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, filename), buffer);

    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
