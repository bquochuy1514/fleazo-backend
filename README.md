# Fleazo Backend

Backend API for **Fleazo** — a secondhand marketplace for Vietnamese university students to buy and sell within their own campus community.

> Frontend: [`fleazo-frontend`](https://github.com/bquochuy1514/fleazo-frontend) · AI Service: [`fleazo-ai`](https://github.com/bquochuy1514/fleazo-ai)

## Tech Stack

| Layer        | Technology                                                              |
| ------------ | ----------------------------------------------------------------------- |
| Framework    | NestJS (Node.js + TypeScript)                                           |
| Database     | PostgreSQL                                                              |
| ORM          | Prisma v7 (driver adapter, no query-engine binary at runtime)           |
| Auth         | JWT (access + refresh rotation), Google OAuth, email OTP                |
| Payment      | PayOS (membership plan upgrades only — not order/checkout)              |
| Realtime     | Socket.IO                                                               |
| Email        | Nodemailer (SMTP)                                                       |
| File Storage | Cloudinary                                                              |
| Address data | provinces.open-api.vn (Tỉnh/Thành phố → Phường/Xã, 2-level)             |
| AI           | Gemini via `fleazo-ai` — AI-assisted listing fill, LLM shopping chatbot |

## Core Features

- **Listings** — create/edit/draft a listing, multi-image upload, category + location picker. New listings and edits to _live_ listings both go through an admin approval queue.
- **AI-assisted listing creation** — upload photos and get an AI-drafted title, description and category via `fleazo-ai` (Gemini), capped to a few images per call to keep it cheap; the seller reviews before publishing.
- **Membership tiers** (Free / Basic / Premium) — differ in max active listings, listing duration, and max images per listing. Upgrades are paid through PayOS.
- **Realtime chat** — 1-to-1 messaging over Socket.IO with read receipts, message recall, and online status.
- **Reviews** — rate + comment a seller (1–5 stars), gated on having exchanged at least one message with them first. One review per reviewer–seller pair — reviewing again updates it instead of creating a duplicate.
- **Saved listings** — a buyer's personal shortlist.
- **LLM chatbot** — natural-language shopping assistant (`fleazo-ai`) that can call a real `search_listings` function against this API instead of hallucinating results, grounded on a small set of hand-written help docs for policy/how-to questions.
- **Admin moderation** — approve/reject new listings and edits to live listings, with a reason surfaced back to the seller.

## Prerequisites

- Node.js >= 20
- PostgreSQL >= 15
- npm

## Getting Started

```bash
# 1. Clone the repo
git clone https://github.com/bquochuy1514/fleazo-backend.git
cd fleazo-backend

# 2. Install dependencies
npm install

# 3. Copy env file and fill in values
cp .env.example .env

# 4. Generate Prisma Client
npx prisma generate

# 5. Push the schema to your database (this project doesn't use
#    Prisma Migrate — schema changes go straight through `db push`)
npx prisma db push

# 6. Seed categories, universities, provinces/wards, membership plans and
#    an admin account (admin@fleazo.com / Fleazoadmin123!)
npx prisma db seed

# 7. Start the dev server
npm run start:dev
```

To wipe and reseed everything from scratch: `npx prisma migrate reset` (drops the DB, re-applies the schema, and reseeds automatically).

## Project Structure

```
src/
├── modules/
│   ├── auth/             # JWT auth, Google OAuth, email OTP
│   ├── users/            # Profile, avatar upload
│   ├── products/         # Listings: CRUD, images, AI suggest, admin moderation
│   ├── categories/       # Category tree + search aliases
│   ├── locations/        # Provinces/wards
│   ├── universities/     # University list for the seller's optional student-identity field
│   ├── membership/       # Plans + PayOS payment for upgrades
│   ├── reviews/          # Seller ratings + comments
│   ├── chat/             # 1-to-1 realtime chat (Socket.IO)
│   ├── chatbot/          # Thin proxy to fleazo-ai's LLM chatbot
│   ├── mail/             # Nodemailer (OTP, password reset)
│   └── upload/           # Cloudinary upload service
├── common/               # Decorators, guards, filters, interceptors, pipes, utils, types
├── config/               # Typed config (jwt, google, mail, cloudinary, fleazo-ai)
├── generated/prisma/     # Auto-generated Prisma Client (gitignored)
├── prisma.service.ts
└── main.ts
```

## Environment Variables

See [`.env.example`](.env.example) for the full list with comments. Summary:

```env
PORT=8080
FRONTEND_URL=

DATABASE_URL=

JWT_ACCESS_SECRET=
JWT_ACCESS_EXPIRES_IN=1h
JWT_REFRESH_SECRET=
JWT_REFRESH_EXPIRES_IN=7d

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

MAIL_HOST=
MAIL_PORT=587
MAIL_USER=
MAIL_PASSWORD=

PAYOS_CLIENT_ID=
PAYOS_API_KEY=
PAYOS_CHECKSUM_KEY=

# Shared-secret auth with fleazo-ai — FLEAZO_AI_INTERNAL_API_KEY here must
# match fleazo-ai's BACKEND_INTERNAL_API_KEY exactly.
FLEAZO_AI_BASE_URL=
FLEAZO_AI_INTERNAL_API_KEY=
```

## API Documentation

Swagger UI is served at `/api/docs` while the server is running.

## Deployment

Ships as a Docker image (`Dockerfile` in this repo), deployed to [Fly.io](https://fly.io) with a [Neon](https://neon.tech) Postgres database.

```bash
fly auth login
fly apps create fleazo-backend   # first time only
fly secrets set DATABASE_URL=... JWT_ACCESS_SECRET=... # ...all vars above
fly deploy
```

`fly.toml` pins `min_machines_running = 1` so the API stays warm (no cold-start on first request) — see that file for the rest of the config.

## License

MIT
