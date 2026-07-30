import type { ImageTransition } from "./transitions";

export type { ImageTransition } from "./transitions";
export {
  DEFAULT_IMAGE_TRANSITION,
  IMAGE_TRANSITIONS,
  normalizeImageTransition,
} from "./transitions";

export type User = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

export type CardTheme = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
};

export type BirthdayCard = {
  id: string;
  userId: string;
  recipientName: string;
  recipientEmail: string | null;
  recipientPhone: string | null;
  senderName: string;
  title: string;
  message: string;
  theme: CardTheme;
  images: string[];
  videoUrl: string | null;
  imageTransition: ImageTransition;
  musicEnabled: boolean;
  shareToken: string;
  createdAt: string;
  updatedAt: string;
};

export type CardInput = {
  recipientName: string;
  recipientEmail?: string;
  recipientPhone?: string;
  senderName: string;
  title: string;
  message: string;
  theme: CardTheme;
  images: string[];
  videoUrl?: string | null;
  imageTransition?: ImageTransition;
  musicEnabled?: boolean;
};

export const DEFAULT_THEME: CardTheme = {
  primary: "#FF5A5F",
  secondary: "#FFB347",
  accent: "#00C9A7",
  background: "#FFF7F5",
  text: "#1F2937",
};
