# Fleazo Backend — AGENTS.md

> **Repo:** `fleazo-backend` — NestJS backend only.
> Frontend lives in `fleazo-frontend`, AI service in `fleazo-ai` (Python FastAPI, not yet started).

## Project Overview

Fleazo is a student secondhand marketplace platform built for Vietnamese university students.
It includes a recommendation engine (session-based + content-based + quality scoring)
and an AI-powered shopping chatbot as the core thesis novelty.

## Tech Stack

- Runtime: Node.js with NestJS framework
- Language: TypeScript
- Database: PostgreSQL via Prisma ORM (v7)
- Auth: JWT (access + refresh token rotation) + Google OAuth
- Payment: PayOS
- Realtime: WebSocket (chat between buyer and seller)

## Project Structure

```
src/
├── generated/
│   └── prisma/           # Auto-generated Prisma Client (do not edit manually)
├── modules/
│   ├── auth/             # JWT auth, Google OAuth, email verification, OTP reset
│   ├── users/            # User profile, avatar upload
│   ├── products/         # CRUD listings, image upload, quality scoring
│   ├── categories/       # Product categories
│   ├── orders/           # Transactions, PayOS webhook
│   ├── chat/             # Realtime WebSocket chat
│   ├── reviews/          # Rating and review after transaction
│   ├── recommendation/   # Session-based + content-based recommendation engine
│   └── chatbot/          # LLM-powered shopping assistant (function calling)
├── common/
│   ├── decorators/       # Custom decorators (e.g. @CurrentUser)
│   ├── guards/           # Auth guards (JwtAuthGuard, RolesGuard)
│   ├── filters/          # Global exception filters
│   ├── interceptors/     # Response transform interceptor
│   └── pipes/            # Validation pipes
├── config/               # App config, env validation
├── prisma.service.ts     # PrismaService (single file, no separate module)
└── main.ts
```

## Prisma Setup (v7)

- Generator: `prisma-client` (not `prisma-client-js`)
- Output: `src/generated/prisma` (inside src, same level as modules)
- Config: `prisma.config.ts` at root (contains DATABASE_URL)
- `generated/` is gitignored — run `npx prisma generate` after cloning
- To use Prisma in a module, add `PrismaService` directly to providers:

```typescript
@Module({
  controllers: [XxxController],
  providers: [XxxService, PrismaService],
  exports: [XxxService],
})
export class XxxModule {}
```

## Database

- ORM: Prisma v7
- DB: PostgreSQL
- Naming convention: snake_case for DB columns, camelCase in TypeScript (via @map)
- Useful commands:
  - `npx prisma db push` — sync schema to DB during development
  - `npx prisma migrate dev --name <name>` — create migration file
  - `npx prisma generate` — regenerate Prisma Client after schema change
  - `npx prisma studio` — visual DB browser

## Auth Flow

- Register → email verification (OTP code) → login
- Login returns access_token (short-lived) + refresh_token (long-lived, hashed in DB)
- Google OAuth for social login
- Password reset via OTP sent to email

## Key Conventions

- All modules follow NestJS standard structure: module / controller / service
- DTOs use class-validator decorators for validation
- Responses are wrapped in a standard format: { statusCode, message, data }
- snake_case in DB, camelCase in TypeScript code
- ESLint unsafe rules disabled for class-validator decorator patterns

## Current Status

Core setup done. Auth module in progress — register endpoint being built.

## Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):
<type>(<scope>): <subject>

**Types:**

- `feat` — tính năng mới
- `fix` — bug fix
- `chore` — config, tooling, dependencies (không ảnh hưởng logic)
- `refactor` — refactor code, không thêm feature hay fix bug
- `docs` — chỉ thay đổi documentation
- `test` — thêm hoặc sửa test
- `style` — format, lint (không ảnh hưởng logic)

**Scope** — tên module liên quan (optional nhưng khuyến khích):
`auth`, `users`, `products`, `orders`, `chat`, `recommendation`, `chatbot`, `prisma`, `config`

**Examples:**
feat(auth): add register endpoint with email OTP verification

fix(auth): handle expired refresh token edge case

chore(prisma): add User model and run initial migration

refactor(products): extract quality scoring into separate service

docs: update AGENTS.md with commit convention

**Rules:**

- Subject dùng tiếng Anh, imperative mood ("add" không phải "added")
- Không viết hoa chữ đầu subject
- Không có dấu chấm cuối subject
- Subject tối đa 72 ký tự
