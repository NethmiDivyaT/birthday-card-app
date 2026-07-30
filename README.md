# WishLink — Online Birthday Card App

Create animated birthday cards with photos, video, custom colors, and sound — then share unique links by email or WhatsApp.

## Features

- Sender accounts (register / login)
- Custom message, theme colors, photos, and video per card
- Batch create many recipients with different customizations
- Animated card viewer with birthday tune
- Share via WhatsApp, email, or copy link

## Local setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Copy `.env.example` to `.env.local` and set `AUTH_SECRET`.

Local development uses SQLite at `data/birthday.db`.

## Deploy on Vercel (important)

Vercel cannot use a local SQLite file. Create a free [Turso](https://turso.tech) database and add these Environment Variables in the Vercel project:

1. `AUTH_SECRET` — any long random string  
2. `TURSO_DATABASE_URL` — from Turso (starts with `libsql://`)  
3. `TURSO_AUTH_TOKEN` — from Turso  

Turso CLI example:

```bash
turso auth login
turso db create wishlink
turso db show wishlink --url
turso db tokens create wishlink
```

Then redeploy the Vercel project.

## Stack

- Next.js App Router
- SQLite locally / Turso (`@libsql/client`) in production
- Uploads stored in `public/uploads` (local only; use a blob store for durable uploads on Vercel)
