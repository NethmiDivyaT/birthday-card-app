"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CardTheme, ImageTransition } from "@/lib/types";
import { DEFAULT_IMAGE_TRANSITION, DEFAULT_THEME, IMAGE_TRANSITIONS } from "@/lib/types";
import { createSlideshowVideo } from "@/lib/createSlideshowVideo";
import { CardViewer } from "./CardViewer";

export type RecipientDraft = {
  key: string;
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string;
  title: string;
  message: string;
  theme: CardTheme;
};

type Props = {
  senderName: string;
  mode?: "create" | "edit";
  cardId?: string;
  initial?: {
    recipientName: string;
    recipientEmail: string;
    recipientPhone: string;
    senderName: string;
    title: string;
    message: string;
    theme: CardTheme;
    images: string[];
    videoUrl: string | null;
    imageTransition: ImageTransition;
    musicEnabled: boolean;
  };
};

function blankRecipient(senderName: string, key = "recipient-1"): RecipientDraft {
  return {
    key,
    recipientName: "",
    recipientEmail: "",
    recipientPhone: "",
    title: "Happy Birthday!",
    message: `Wishing you a wonderful day filled with joy. With love from ${senderName}.`,
    theme: { ...DEFAULT_THEME },
  };
}

async function uploadFile(file: File, kind: "image" | "video") {
  const form = new FormData();
  form.append("file", file);
  form.append("kind", kind);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data.url as string;
}

export function CardEditor({ senderName, mode = "create", cardId, initial }: Props) {
  const router = useRouter();
  const [sender, setSender] = useState(initial?.senderName ?? senderName);
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [videoUrl, setVideoUrl] = useState<string | null>(initial?.videoUrl ?? null);
  const [imageTransition, setImageTransition] = useState<ImageTransition>(
    initial?.imageTransition ?? DEFAULT_IMAGE_TRANSITION,
  );
  const [musicEnabled, setMusicEnabled] = useState(initial?.musicEnabled ?? true);
  const [busy, setBusy] = useState(false);
  const [videoProgress, setVideoProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [recipients, setRecipients] = useState<RecipientDraft[]>([
    initial
      ? {
          key: "edit",
          recipientName: initial.recipientName,
          recipientEmail: initial.recipientEmail ?? "",
          recipientPhone: initial.recipientPhone ?? "",
          title: initial.title,
          message: initial.message,
          theme: initial.theme,
        }
      : blankRecipient(senderName),
  ]);

  const active = recipients[activeIdx] ?? recipients[0];
  const selectedTransition = IMAGE_TRANSITIONS.find((t) => t.id === imageTransition);

  const previewCard = useMemo(
    () => ({
      id: "preview",
      userId: "preview",
      recipientName: active.recipientName || "Friend",
      recipientEmail: active.recipientEmail || null,
      recipientPhone: active.recipientPhone || null,
      senderName: sender || "You",
      title: active.title || "Happy Birthday!",
      message: active.message || "Your message appears here.",
      theme: active.theme,
      images,
      videoUrl,
      imageTransition,
      musicEnabled,
      shareToken: "preview",
      createdAt: "",
      updatedAt: "",
    }),
    [active, sender, images, videoUrl, imageTransition, musicEnabled],
  );

  function updateActive(patch: Partial<RecipientDraft>) {
    setRecipients((list) =>
      list.map((r, i) => (i === activeIdx ? { ...r, ...patch } : r)),
    );
  }

  function updateTheme(patch: Partial<CardTheme>) {
    updateActive({ theme: { ...active.theme, ...patch } });
  }

  function addRecipient() {
    setRecipients((list) => {
      const next = [
        ...list,
        {
          ...blankRecipient(sender, `recipient-${list.length + 1}-${Date.now()}`),
          theme: { ...active.theme },
          title: active.title,
          message: active.message,
        },
      ];
      setActiveIdx(next.length - 1);
      return next;
    });
  }

  function removeRecipient(index: number) {
    setRecipients((list) => {
      if (list.length === 1) return list;
      const next = list.filter((_, i) => i !== index);
      setActiveIdx((cur) => Math.min(cur, next.length - 1));
      return next;
    });
  }

  async function onImagesSelected(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError("");
    try {
      const remaining = 8 - images.length;
      const picked = Array.from(files).slice(0, remaining);
      const uploaded: string[] = [];
      for (const file of picked) {
        uploaded.push(await uploadFile(file, "image"));
      }
      setImages((prev) => [...prev, ...uploaded]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Image upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function onVideoSelected(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const url = await uploadFile(file, "video");
      setVideoUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Video upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function createVideoFromPhotos() {
    if (images.length < 1) {
      setError("Add photos first, then create a video from them");
      return;
    }
    setBusy(true);
    setError("");
    setVideoProgress(0);
    try {
      const blob = await createSlideshowVideo({
        images,
        transition: imageTransition,
        secondsPerImage: 2.5,
        background: active.theme.background,
        onProgress: setVideoProgress,
      });
      const file = new File([blob], `wishlink-slideshow-${Date.now()}.webm`, {
        type: blob.type || "video/webm",
      });
      const url = await uploadFile(file, "video");
      setVideoUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create video from photos");
    } finally {
      setBusy(false);
      setVideoProgress(null);
    }
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      if (mode === "edit" && cardId) {
        const res = await fetch(`/api/cards/${cardId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...active,
            senderName: sender,
            images,
            videoUrl,
            imageTransition,
            musicEnabled,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Save failed");
        router.push("/dashboard");
        router.refresh();
        return;
      }

      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shared: {
            senderName: sender,
            images,
            videoUrl,
            imageTransition,
            musicEnabled,
          },
          recipients: recipients.map((r) => ({
            recipientName: r.recipientName,
            recipientEmail: r.recipientEmail,
            recipientPhone: r.recipientPhone,
            title: r.title,
            message: r.message,
            theme: r.theme,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Create failed");
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="editor-grid">
      <div className="editor-panel">
        <div className="field">
          <label>Your name (sender)</label>
          <input value={sender} onChange={(e) => setSender(e.target.value)} />
        </div>

        {mode === "create" && (
          <div className="recipient-tabs">
            <div className="tabs">
              {recipients.map((r, i) => (
                <button
                  key={r.key}
                  type="button"
                  className={i === activeIdx ? "tab active" : "tab"}
                  onClick={() => setActiveIdx(i)}
                >
                  {r.recipientName || `Recipient ${i + 1}`}
                </button>
              ))}
            </div>
            <div className="tab-actions">
              <button type="button" className="btn btn-ghost" onClick={addRecipient}>
                + Add recipient
              </button>
              {recipients.length > 1 && (
                <button
                  type="button"
                  className="btn btn-ghost danger"
                  onClick={() => removeRecipient(activeIdx)}
                >
                  Remove
                </button>
              )}
            </div>
            <p className="hint">
              Each recipient gets their own customized card link (message, colors, contact).
              Images, video, transition, and music are shared across the batch.
            </p>
          </div>
        )}

        <div className="field-row">
          <div className="field">
            <label>Recipient name</label>
            <input
              value={active.recipientName}
              onChange={(e) => updateActive({ recipientName: e.target.value })}
              placeholder="Alex"
            />
          </div>
          <div className="field">
            <label>Email (optional)</label>
            <input
              value={active.recipientEmail}
              onChange={(e) => updateActive({ recipientEmail: e.target.value })}
              placeholder="alex@email.com"
            />
          </div>
        </div>

        <div className="field">
          <label>WhatsApp / phone (optional)</label>
          <input
            value={active.recipientPhone}
            onChange={(e) => updateActive({ recipientPhone: e.target.value })}
            placeholder="+94771234567"
          />
        </div>

        <div className="field">
          <label>Card title</label>
          <input
            value={active.title}
            onChange={(e) => updateActive({ title: e.target.value })}
          />
        </div>

        <div className="field">
          <label>Birthday message</label>
          <textarea
            rows={4}
            value={active.message}
            onChange={(e) => updateActive({ message: e.target.value })}
          />
        </div>

        <fieldset className="theme-fieldset">
          <legend>Theme colors</legend>
          {(
            [
              ["primary", "Primary"],
              ["secondary", "Secondary"],
              ["accent", "Accent"],
              ["background", "Background"],
              ["text", "Text"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="color-field">
              <span>{label}</span>
              <input
                type="color"
                value={active.theme[key]}
                onChange={(e) => updateTheme({ [key]: e.target.value })}
              />
            </label>
          ))}
        </fieldset>

        <div className="field">
          <label>Photos (up to 8)</label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            onChange={(e) => void onImagesSelected(e.target.files)}
          />
          <div className="upload-preview-row">
            {images.map((src) => (
              <div key={src} className="upload-chip">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" />
                <button
                  type="button"
                  onClick={() => setImages((prev) => prev.filter((x) => x !== src))}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Photo transition animation</label>
          <div className="transition-grid">
            {IMAGE_TRANSITIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={
                  imageTransition === option.id
                    ? "transition-option active"
                    : "transition-option"
                }
                onClick={() => setImageTransition(option.id)}
              >
                <strong>{option.label}</strong>
                <span>{option.hint}</span>
              </button>
            ))}
          </div>
          {selectedTransition && (
            <p className="hint">Selected: {selectedTransition.label} — used in the slideshow and generated video.</p>
          )}
        </div>

        <div className="field">
          <label>Video (plays after photos)</label>
          <div className="video-actions">
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              onChange={(e) => void onVideoSelected(e.target.files)}
            />
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy || images.length < 1}
              onClick={() => void createVideoFromPhotos()}
            >
              {videoProgress !== null
                ? `Creating video… ${Math.round(videoProgress * 100)}%`
                : "Create video from photos"}
            </button>
          </div>
          <p className="hint">
            Builds a short slideshow video from your photos using the transition you selected.
            Works best in Chrome or Edge.
          </p>
          {videoUrl && (
            <div className="video-preview">
              <video src={videoUrl} controls playsInline />
              <button type="button" className="btn btn-ghost" onClick={() => setVideoUrl(null)}>
                Remove video
              </button>
            </div>
          )}
        </div>

        <label className="check-row">
          <input
            type="checkbox"
            checked={musicEnabled}
            onChange={(e) => setMusicEnabled(e.target.checked)}
          />
          Include birthday tune
        </label>

        {error && <p className="form-error">{error}</p>}

        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void save()}>
          {busy
            ? videoProgress !== null
              ? `Creating video… ${Math.round(videoProgress * 100)}%`
              : "Saving…"
            : mode === "edit"
              ? "Save changes"
              : recipients.length > 1
                ? `Create ${recipients.length} cards`
                : "Create card"}
        </button>
      </div>

      <div className="preview-panel">
        <h2>Live preview</h2>
        <CardViewer card={previewCard} preview />
      </div>
    </div>
  );
}
