# Fleazo Backend

Backend service for **Fleazo** — a secondhand marketplace platform for Vietnamese university students, featuring an AI-powered recommendation engine and shopping chatbot.

> Frontend: `fleazo-frontend` · AI Service: `fleazo-ai`

## Tech Stack

| Layer        | Technology                                          |
| ------------ | --------------------------------------------------- |
| Framework    | NestJS (Node.js + TypeScript)                       |
| Database     | PostgreSQL                                          |
| ORM          | Prisma v7                                           |
| Auth         | JWT (access + refresh token rotation), Google OAuth |
| Payment      | PayOS                                               |
| Realtime     | WebSocket                                           |
| Email        | Nodemailer (Gmail SMTP)                             |
| File Storage | Cloudinary                                          |

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
│   ├── orders/           # Transactions, PayOS webhook
│   ├── chat/             # Realtime WebSocket chat
│   ├── reviews/          # Rating and review
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
| Users          | In progress |
| Products       | Planned     |
| Categories     | Planned     |
| Orders         | Planned     |
| Chat           | Planned     |
| Reviews        | Planned     |
| Recommendation | Planned     |
| Chatbot        | Planned     |

## License

MIT
