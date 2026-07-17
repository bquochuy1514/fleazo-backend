# Fleazo Backend

Backend service for **Fleazo** — a secondhand marketplace platform for Vietnamese university students, featuring an AI-powered recommendation engine and shopping chatbot.

> Frontend: `fleazo-frontend` · AI Service: `fleazo-ai`

## Tech Stack

| Layer        | Technology                                                              |
| ------------ | ----------------------------------------------------------------------- |
| Framework    | NestJS (Node.js + TypeScript)                                           |
| Database     | PostgreSQL                                                              |
| ORM          | Prisma v7                                                               |
| Auth         | JWT (access + refresh token rotation), Google OAuth                     |
| Payment      | PayOS                                                                   |
| Realtime     | Socket.IO                                                               |
| Email        | Nodemailer (Gmail SMTP)                                                 |
| File Storage | Cloudinary                                                              |
| Address API  | provinces.open-api.vn `/api/v2/` (Tỉnh/Thành phố → Phường/Xã, 2-level)  |
| AI/ML        | Recommendation Engine (session-based + content-based + quality scoring) |
| Chatbot      | LLM-powered shopping assistant (function calling)                       |

## Core Features

- **Secondhand marketplace** — students buy and sell within the university community
- **Recommendation engine** — session-based filtering for cold-start/anonymous users, content-based filtering ranked by Quality Score
- **Quality Score** — automatic listing scoring based on image count, description completeness, seller reputation, engagement, and freshness. Prevents spam and surfaces genuinely good listings
- **Listing monetization** — membership tiers (Free/Basic/Premium), boost (temporary feed priority), extend (renew expired listing without re-posting). Payments (via PayOS) only cover these — product sales happen directly between buyer and seller, off-platform
- **LLM chatbot** — natural language shopping assistant using function calling into the recommendation engine (powered by `fleazo-ai` Python FastAPI service)
- **Realtime chat** — 1-to-1 messaging (Socket.IO) with read receipts, message recall, online status, and cross-conversation notifications

## Prerequisites

- Node.js >= 20
- PostgreSQL >= 15
- npm or yarn

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

# 5. Push schema to database
npx prisma db push

# 6. Start dev server
npm run start:dev
```

## Project Structure

```
src/
├── modules/
│   ├── auth/             # JWT auth, Google OAuth, email OTP
│   ├── mail/             # Email service (Nodemailer + Gmail SMTP)
│   ├── upload/           # Cloudinary upload service
│   ├── users/            # User profile, avatar upload
│   ├── products/         # Listings, image upload, quality scoring
│   ├── categories/       # Product categories
│   ├── payments/         # PayOS transactions for Membership/Boost/Extend only
│   ├── chat/             # 1-to-1 realtime chat (Socket.IO)
│   ├── reviews/          # Seller reputation (rating + reply)
│   ├── recommendation/   # Session-based + content-based engine
│   └── chatbot/          # LLM shopping assistant (function calling)
├── common/               # Decorators, guards, filters, interceptors, pipes, utils, types
├── config/               # Typed config files (jwt, google, mail, cloudinary)
├── generated/prisma/     # Auto-generated Prisma Client (gitignored)
├── prisma.service.ts
└── main.ts
```

## Environment Variables

```env
DATABASE_URL=postgresql://user:password@localhost:5432/fleazo
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:8080/api/auth/google/callback
PAYOS_CLIENT_ID=
PAYOS_API_KEY=
PAYOS_CHECKSUM_KEY=
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=
MAIL_PASSWORD=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

## API Documentation

Available at `/api/docs` (Swagger UI) when the server is running.

## Development Status

| Module         | Status      |
| -------------- | ----------- |
| Auth           | Done        |
| Users          | Done        |
| Categories     | Done        |
| Products       | Done        |
| Chat           | Done        |
| Reviews        | Design only |
| Payments       | Planned     |
| Recommendation | Planned     |
| Chatbot        | Planned     |

## License

MIT
