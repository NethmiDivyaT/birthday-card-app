export const IMAGE_TRANSITIONS = [
  { id: "fade", label: "Fade", hint: "Soft crossfade between photos" },
  { id: "slide", label: "Slide", hint: "Photos slide in from the side" },
  { id: "zoom", label: "Zoom", hint: "Zoom and dissolve into the next" },
  { id: "flip", label: "Flip", hint: "Card-style flip between photos" },
  { id: "kenburns", label: "Ken Burns", hint: "Slow pan and zoom on each photo" },
] as const;

export type ImageTransition = (typeof IMAGE_TRANSITIONS)[number]["id"];

export const DEFAULT_IMAGE_TRANSITION: ImageTransition = "fade";

export function isImageTransition(value: unknown): value is ImageTransition {
  return IMAGE_TRANSITIONS.some((t) => t.id === value);
}

export function normalizeImageTransition(value: unknown): ImageTransition {
  return isImageTransition(value) ? value : DEFAULT_IMAGE_TRANSITION;
}
