"use client";

import { useEffect, useRef, useState } from "react";
import type { BirthdayCard } from "@/lib/types";
import { DEFAULT_IMAGE_TRANSITION } from "@/lib/transitions";
import { Fireworks } from "./Fireworks";

type Props = {
  card: BirthdayCard;
  preview?: boolean;
};

function playBirthdayTune(audioCtx: AudioContext) {
  const notes = [
    [392, 0.35],
    [392, 0.35],
    [440, 0.7],
    [392, 0.7],
    [523.25, 0.7],
    [493.88, 1.1],
    [392, 0.35],
    [392, 0.35],
    [440, 0.7],
    [392, 0.7],
    [587.33, 0.7],
    [523.25, 1.1],
  ] as const;

  let t = audioCtx.currentTime + 0.05;
  for (const [freq, dur] of notes) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.12, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
    t += dur;
  }
}

function playFireworkPops(audioCtx: AudioContext) {
  const pops = [0, 0.22, 0.48, 0.9, 1.35, 1.8];
  for (const delay of pops) {
    const t = audioCtx.currentTime + delay;
    const noiseDuration = 0.18;
    const buffer = audioCtx.createBuffer(1, Math.ceil(audioCtx.sampleRate * noiseDuration), audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const src = audioCtx.createBufferSource();
    src.buffer = buffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 900 + Math.random() * 1400;
    filter.Q.value = 0.8;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.18, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + noiseDuration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    src.start(t);
    src.stop(t + noiseDuration + 0.02);
  }
}

export function CardViewer({ card, preview = false }: Props) {
  const [opened, setOpened] = useState(preview);
  const [celebrate, setCelebrate] = useState(preview);
  const [musicOn, setMusicOn] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const audioRef = useRef<AudioContext | null>(null);
  const theme = card.theme;
  const transition = card.imageTransition || DEFAULT_IMAGE_TRANSITION;
  const fireworkColors = [theme.primary, theme.secondary, theme.accent, "#FFE66D", "#FFFFFF"];

  useEffect(() => {
    if (!card.images.length) return;
    const id = window.setInterval(() => {
      setActiveImage((i) => (i + 1) % card.images.length);
      setAnimKey((k) => k + 1);
    }, 3200);
    return () => window.clearInterval(id);
  }, [card.images.length]);

  useEffect(() => {
    return () => {
      void audioRef.current?.close();
    };
  }, []);

  function ensureAudio() {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!audioRef.current) audioRef.current = new Ctx();
    void audioRef.current.resume();
    return audioRef.current;
  }

  function startMusic() {
    if (!card.musicEnabled) return;
    playBirthdayTune(ensureAudio());
    setMusicOn(true);
  }

  function openCard() {
    setOpened(true);
    setCelebrate(true);
    const ctx = ensureAudio();
    playFireworkPops(ctx);
    startMusic();
  }

  function replayCelebration() {
    setCelebrate(false);
    window.setTimeout(() => {
      setCelebrate(true);
      playFireworkPops(ensureAudio());
    }, 40);
  }

  function selectImage(index: number) {
    setActiveImage(index);
    setAnimKey((k) => k + 1);
  }

  return (
    <div
      className={`card-stage${opened ? " is-open" : ""}`}
      style={
        {
          "--c-primary": theme.primary,
          "--c-secondary": theme.secondary,
          "--c-accent": theme.accent,
          "--c-bg": theme.background,
          "--c-text": theme.text,
        } as React.CSSProperties
      }
    >
      <Fireworks active={celebrate} colors={fireworkColors} />

      <div className="balloon balloon-a" />
      <div className="balloon balloon-b" />
      <div className="balloon balloon-c" />
      <div className="sparkle s1" />
      <div className="sparkle s2" />
      <div className="sparkle s3" />

      {!opened ? (
        <button type="button" className="sealed-card" onClick={openCard}>
          <span className="sealed-ribbon" />
          <span className="sealed-title">A surprise for {card.recipientName}</span>
          <span className="sealed-hint">Tap to open</span>
        </button>
      ) : (
        <article className="open-card">
          <header className="open-header">
            <p className="from-line">From {card.senderName}</p>
            <h1>{card.title}</h1>
            <p className="to-line">Dear {card.recipientName},</p>
          </header>

          <p className="message">{card.message}</p>

          {card.images.length > 0 && (
            <div className="media-mosaic">
              <div className={`hero-photo transition-${transition}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={`${card.images[activeImage]}-${animKey}`}
                  src={card.images[activeImage]}
                  alt=""
                  className={`slide-anim slide-${transition}`}
                />
              </div>
              <div className="thumb-row">
                {card.images.map((src, i) => (
                  <button
                    key={src}
                    type="button"
                    className={i === activeImage ? "thumb active" : "thumb"}
                    onClick={() => selectImage(i)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {card.videoUrl && (
            <div className="video-wrap">
              <video src={card.videoUrl} controls playsInline poster={card.images[0]} />
            </div>
          )}

          <div className="viewer-actions">
            {card.musicEnabled && (
              <button type="button" className="music-btn" onClick={startMusic}>
                {musicOn ? "Play again ♪" : "Play birthday tune ♪"}
              </button>
            )}
            <button type="button" className="music-btn fireworks-btn" onClick={replayCelebration}>
              Fireworks again
            </button>
          </div>
        </article>
      )}
    </div>
  );
}
