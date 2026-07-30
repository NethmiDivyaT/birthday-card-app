# WishLink — Online Birthday Card App

Create animated birthday cards with photos, video, custom colors, and sound — then share unique links by email or WhatsApp.

## Features

- Sender accounts (register / login)
- Custom message, theme colors, photos, and video per card
- Batch create many recipients with different customizations
- Animated card viewer with birthday tune
- Share via WhatsApp, email, or copy link

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Optional: set `AUTH_SECRET` in `.env.local` for production session signing.

## Stack

- Next.js App Router
- SQLite via `@libsql/client` (local `data/birthday.db`)
- Uploads stored in `public/uploads`
