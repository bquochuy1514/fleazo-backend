# Fleazo Backend

Backend service for **Fleazo** — a secondhand marketplace platform for Vietnamese university students, featuring an AI-powered recommendation engine and shopping chatbot.

> Frontend: `fleazo-frontend` · AI Service: `fleazo-ai`

## Tech Stack

| Layer     | Technology                                          |
| --------- | --------------------------------------------------- |
| Framework | NestJS (Node.js + TypeScript)                       |
| Database  | PostgreSQL                                          |
| ORM       | Prisma v7                                           |
| Auth      | JWT (access + refresh token rotation), Google OAuth |
| Payment   | PayOS                                               |
| Realtime  | WebSocket                                           |
| Email     | Nodemailer (Gmail SMTP)                             |

## Prerequisites

- Node.js >= 20
- PostgreSQL >= 15
- npm or yarn

## Getting Started

```bash
# 1. Clone the repo
git clone https://github.com/your-username/fleazo-backend.git
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
│   ├── users/            # User profile, avatar upload
│   ├── products/         # Listings, image upload, quality scoring
│   ├── categories/       # Product categories
│   ├── orders/           # Transactions, PayOS webhook
│   ├── chat/             # Realtime WebSocket chat
│   ├── reviews/          # Rating and review
│   ├── recommendation/   # Session-based + content-based engine
│   └── chatbot/          # LLM shopping assistant (function calling)
├── common/               # Decorators, guards, filters, interceptors, pipes, utils
├── config/               # App config, env validation
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
PAYOS_CLIENT_ID=
PAYOS_API_KEY=
PAYOS_CHECKSUM_KEY=
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=
MAIL_PASSWORD=
```

## API Documentation

> Coming soon — will be available at `/api/docs` (Swagger) once core modules are complete.

## Development Status

| Module         | Status         |
| -------------- | -------------- |
| Auth           | 🚧 In progress |
| Users          | ⬜ Planned     |
| Products       | ⬜ Planned     |
| Categories     | ⬜ Planned     |
| Orders         | ⬜ Planned     |
| Chat           | ⬜ Planned     |
| Reviews        | ⬜ Planned     |
| Recommendation | ⬜ Planned     |
| Chatbot        | ⬜ Planned     |

## License

MIT
