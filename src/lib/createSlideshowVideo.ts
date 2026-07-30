import type { ImageTransition } from "./transitions";

type Options = {
  images: string[];
  transition?: ImageTransition;
  secondsPerImage?: number;
  width?: number;
  height?: number;
  background?: string;
  onProgress?: (ratio: number) => void;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load image: ${src}`));
    img.src = src;
  });
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  width: number,
  height: number,
  scale = 1,
  offsetX = 0,
  offsetY = 0,
) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const cover = Math.max(width / iw, height / ih) * scale;
  const dw = iw * cover;
  const dh = ih * cover;
  const dx = (width - dw) / 2 + offsetX * width * 0.08;
  const dy = (height - dh) / 2 + offsetY * height * 0.08;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function paintFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  background: string,
  current: HTMLImageElement,
  next: HTMLImageElement | null,
  transition: ImageTransition,
  progress: number,
  holdProgress: number,
) {
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  const p = easeInOut(Math.min(1, Math.max(0, progress)));

  if (!next || progress <= 0) {
    if (transition === "kenburns") {
      const zoom = 1 + holdProgress * 0.12;
      const ox = Math.sin(holdProgress * Math.PI) * 0.35;
      const oy = Math.cos(holdProgress * Math.PI * 0.8) * 0.2;
      drawCover(ctx, current, width, height, zoom, ox, oy);
    } else {
      drawCover(ctx, current, width, height, 1);
    }
    return;
  }

  if (transition === "fade" || transition === "kenburns") {
    ctx.save();
    ctx.globalAlpha = 1 - p;
    drawCover(ctx, current, width, height, transition === "kenburns" ? 1.12 : 1);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = p;
    drawCover(ctx, next, width, height, 1);
    ctx.restore();
    return;
  }

  if (transition === "slide") {
    ctx.save();
    ctx.translate(-width * p, 0);
    drawCover(ctx, current, width, height, 1);
    ctx.restore();
    ctx.save();
    ctx.translate(width * (1 - p), 0);
    drawCover(ctx, next, width, height, 1);
    ctx.restore();
    return;
  }

  if (transition === "zoom") {
    ctx.save();
    ctx.globalAlpha = 1 - p;
    drawCover(ctx, current, width, height, 1 + p * 0.35);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = p;
    drawCover(ctx, next, width, height, 0.85 + p * 0.15);
    ctx.restore();
    return;
  }

  // flip
  const mid = 0.5;
  if (p < mid) {
    const local = p / mid;
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(Math.max(0.02, 1 - local), 1);
    ctx.translate(-width / 2, -height / 2);
    drawCover(ctx, current, width, height, 1);
    ctx.restore();
  } else {
    const local = (p - mid) / mid;
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(Math.max(0.02, local), 1);
    ctx.translate(-width / 2, -height / 2);
    drawCover(ctx, next, width, height, 1);
    ctx.restore();
  }
}

function pickMimeType() {
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "";
}

export async function createSlideshowVideo(options: Options): Promise<Blob> {
  const {
    images,
    transition = "fade",
    secondsPerImage = 2.4,
    width = 1280,
    height = 720,
    background = "#111111",
    onProgress,
  } = options;

  if (images.length < 1) {
    throw new Error("Add at least one photo first");
  }
  if (typeof MediaRecorder === "undefined") {
    throw new Error("Video creation is not supported in this browser");
  }

  const mimeType = pickMimeType();
  if (!mimeType) {
    throw new Error("This browser cannot record WebM video. Try Chrome or Edge.");
  }

  const loaded = await Promise.all(images.map(loadImage));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not start canvas recorder");

  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 4_500_000,
  });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  const holdMs = Math.max(900, secondsPerImage * 1000 * 0.72);
  const transitionMs = Math.max(450, secondsPerImage * 1000 * 0.28);
  const totalMs =
    loaded.length === 1
      ? holdMs + 400
      : loaded.length * holdMs + (loaded.length - 1) * transitionMs;

  const stopped = new Promise<Blob>((resolve, reject) => {
    recorder.onerror = () => reject(new Error("Recording failed"));
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType.split(";")[0] }));
  });

  recorder.start(200);
  const startedAt = performance.now();

  await new Promise<void>((resolve) => {
    let index = 0;
    let phase: "hold" | "transition" = "hold";
    let phaseStarted = performance.now();

    function tick(now: number) {
      const elapsed = now - startedAt;
      onProgress?.(Math.min(0.99, elapsed / totalMs));

      const current = loaded[index];
      const next = loaded[(index + 1) % loaded.length];
      const phaseElapsed = now - phaseStarted;

      if (phase === "hold") {
        const holdProgress = Math.min(1, phaseElapsed / holdMs);
        paintFrame(ctx!, width, height, background, current, null, transition, 0, holdProgress);
        if (phaseElapsed >= holdMs) {
          if (loaded.length === 1 || index >= loaded.length - 1) {
            recorder.stop();
            resolve();
            return;
          }
          phase = "transition";
          phaseStarted = now;
        }
      } else {
        const progress = Math.min(1, phaseElapsed / transitionMs);
        paintFrame(ctx!, width, height, background, current, next, transition, progress, 1);
        if (phaseElapsed >= transitionMs) {
          index += 1;
          phase = "hold";
          phaseStarted = now;
        }
      }

      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  });

  const blob = await stopped;
  onProgress?.(1);
  if (!blob.size) throw new Error("Created video was empty");
  return blob;
}
