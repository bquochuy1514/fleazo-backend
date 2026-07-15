# Fleazo Backend — AGENTS.md

> **Repo:** `fleazo-backend` — NestJS backend only.
> Frontend lives in `fleazo-frontend`, AI service in `fleazo-ai` (Python FastAPI, not yet started).

## Project Overview

Fleazo is a student secondhand marketplace platform built for Vietnamese university students.
It includes a recommendation engine (session-based + content-based + quality scoring)
and an AI-powered shopping chatbot as the core thesis novelty.

## Product Vision

Fleazo is being built with three goals simultaneously:

1. **Real product** — ship to actual Vietnamese university students, production-ready
2. **Revenue-generating** — monetize through listing services and membership tiers
3. **Graduation thesis** — novelty argument centers on the recommendation engine + AI chatbot

**Never cut features just because it's a thesis.** Always design and implement for production quality and completeness. The thesis deadline is a constraint on time, not on ambition.

### Monetization model

> ⚠️ Parameters below are tentative and subject to change. Do not hardcode these values — they should be configurable.

**Membership tiers (subscription):** 3 tiers — Free / Basic / Premium

- Free: 3 active listings at a time, listings expire after 30 days, max 3 images per listing
- Basic: more active listings, longer expiry, more images per listing (exact limits TBD)
- Premium: even higher limits (exact limits TBD)

**Boost (one-time, per listing):** pay to push a listing to the top of the feed

- Multiple duration options (e.g. 24h / 48h / 72h) at different price points (TBD)
- Integrates with the recommendation engine — boosted listings get a temporary priority score bump, but quality score still applies (no pure pay-to-win)
- Payment via PayOS

**Extend listing (one-time, per listing):** pay to renew an expired listing without re-posting

- Preserves listing history, saved-by-users, and chat context
- Flat fee per renewal (TBD)

## Money Flow — what PayOS does and does NOT cover

**PayOS handles (money → Fleazo):** Membership subscription, Boost, Extend. These are the only real payments in the system.

**PayOS does NOT handle product sales (buyer ↔ seller).** Money for a product transaction moves directly between buyer and seller outside the app (cash on meetup, direct bank transfer) — Fleazo never touches it. Reasons, in order of importance:

1. **Legal** — holding buyer money and later releasing it to a seller is an intermediary-payment activity that requires an NHNN license in Vietnam. Fleazo doesn't have one and shouldn't build a flow that implies it does.
2. **PayOS is a single-merchant collector**, not a marketplace payout system — it has no built-in mechanism to split/hold funds per individual seller.
3. **Behavioral fit** — student C2C trades are mostly in-person meetups on campus; buyers want to inspect items before paying, so forcing payment through the app before meetup adds friction and pushes users off-platform entirely.

**Consequence for the schema: there is no `Order` model.** A 2-way buyer/seller confirmation ("mark as sold" + "confirm received") was considered and dropped — in a C2C flow with no money custody, the app can never actually verify a transaction happened, so a 2-way confirmation only adds complexity without adding trust (both sides could confirm a trade that never happened, or a real trade could go unconfirmed). Instead:

- Seller marks a listing `SOLD` directly on `Product` (single action, already motivated — see `completionRate` below and freeing up their listing slot).
- `Review` is gated by an existing `Chat` thread between buyer and seller on that listing, not by an `Order` record.
- `Product.status` (`SOLD` vs `EXPIRED`) is the only signal the system trusts for "did this seller actually sell things."

## Tech Stack

- Runtime: Node.js with NestJS framework
- Language: TypeScript
- Database: PostgreSQL via Prisma ORM (v7)
- Auth: JWT (access + refresh token rotation) + Google OAuth
- Payment: PayOS
- Realtime: WebSocket (chat between buyer and seller)
- Email: Nodemailer with Gmail SMTP
- File storage: Cloudinary (avatars, product images)
- Address API: [provinces.open-api.vn](https://provinces.open-api.vn) — free, no API key required (Tỉnh/Quận/Phường)

## Recommendation Engine

The recommendation engine is the core thesis novelty. It combines three techniques:

### 1. Session-based Recommendation

Tracks user behavior within the current session (clicks, views) to suggest relevant listings immediately — no login or history required. Solves the cold-start problem for anonymous and new users.

### 2. Content-based Filtering + Quality Score

Finds listings similar to what the user has viewed or purchased, ranked by a Quality Score.

**Quality Score formula (0–100):**

| Signal                 | Max points | Formula                         |
| ---------------------- | ---------- | ------------------------------- |
| Image count            | 15         | `min(count / 5, 1) × 15`        |
| Description length     | 10         | `min(length / 200, 1) × 10`     |
| Condition filled       | 5          | Boolean                         |
| Seller avg rating      | 15         | `(avgRating / 5) × 15`          |
| Seller completion rate | 12         | `completionRate × 12`           |
| Seller response rate   | 8          | `responseRate × 8`              |
| Save count             | 10         | `min(saveCount / 20, 1) × 10`   |
| View count             | 10         | `min(viewCount / 100, 1) × 10`  |
| Freshness              | 15         | `max(1 - daysOld / 30, 0) × 15` |

> ⚠️ Weights above are tentative. Do not hardcode — make them configurable.

**Boost multiplier (monetization integration):**

```
effectiveScore = qualityScore × (isCurrentlyBoosted ? 1.5 : 1.0)
```

Boosted listings get a temporary score bump, but quality score still applies — no pure pay-to-win.

**Quality Score is recalculated on:**

- Seller updates listing (images, description)
- `Product.status` changes to `SOLD` or `EXPIRED` (feeds seller `completionRate` — see Money Flow)
- Save/view count changes (batched, not per-event)
- Nightly cron job (for freshness decay)

Score is stored in `Product.qualityScore` and read at query time via `ORDER BY effectiveScore DESC`.

### 3. LLM Chatbot with Function Calling

User describes what they want in natural language → chatbot calls real functions into the recommendation engine → returns actual listings. Implemented in `fleazo-ai` (Python FastAPI, future service).

Example:

```
User: "tao cần laptop dưới 5 triệu để code, pin trâu"
→ search_listings({ category: "Laptop", maxPrice: 5000000, keywords: ["pin", "lập trình"] })
→ returns top matching listings from DB
```

## Project Structure

```
src/
├── generated/
│   └── prisma/           # Auto-generated Prisma Client (do not edit manually)
├── modules/
│   ├── auth/             # JWT auth, Google OAuth, email verification, OTP reset
│   │   ├── guards/       # JwtAuthGuard, RefreshAuthGuard, GoogleAuthGuard
│   │   └── strategies/   # JwtStrategy, RefreshJwtStrategy, GoogleStrategy
│   ├── mail/             # Email service (Nodemailer + Gmail SMTP)
│   ├── upload/           # Cloudinary upload service
│   ├── users/            # User profile, avatar upload
│   ├── products/         # CRUD listings, image upload, quality scoring
│   ├── categories/       # Product categories
│   ├── payments/         # PayOS transactions for Membership / Boost / Extend (NOT product sales — see Money Flow)
│   ├── chat/             # Realtime WebSocket chat
│   ├── reviews/          # Rating and review, gated by an existing Chat thread on the listing
│   ├── recommendation/   # Session-based + content-based recommendation engine
│   └── chatbot/          # LLM-powered shopping assistant (function calling)
├── common/
│   ├── decorators/       # Custom decorators (@CurrentUser, @Match)
│   ├── guards/           # Auth guards (JwtAuthGuard, RolesGuard)
│   ├── filters/          # Global exception filters
│   ├── interceptors/     # Response transform interceptor
│   ├── pipes/            # Validation pipes
│   ├── types/            # Shared types (JwtPayload)
│   └── utils/            # Shared utilities (hash.util.ts)
├── config/               # Typed config files (jwt, google, mail, cloudinary)
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

## Prisma Model Convention

Model names use PascalCase, table names use snake_case via `@@map`.
Field names use camelCase, column names use snake_case via `@map`.
Always include `createdAt` and `updatedAt` with `@updatedAt` on updatedAt.

Group fields into sections with `// — Section name —` comments:

```prisma
model User {
  // — Identity —
  id       Int      @id @default(autoincrement())
  email    String   @unique
  password String?

  // — Profile —
  fullName String   @map("full_name")
  phone    String?  @db.VarChar(20)
  avatar   String   @default("https://res.cloudinary.com/dazcuspid/image/upload/default_avatar_nj9oa5.avif")
  role     UserRole @default(CUSTOMER)

  // — Account activation (email OTP) —
  isActive          Boolean   @default(false) @map("is_active")
  codeOtp           String?   @db.VarChar(6) @map("code_otp")
  codeOtpExpiration DateTime? @map("code_otp_expiration")

  // — Password reset —
  isOtpVerified Boolean @default(false) @map("is_otp_verified")

  // — Auth tokens —
  hashedRefreshToken String? @map("hashed_refresh_token")

  // — Timestamps —
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("users")
}
```

Rules:

- Model name: `User`, `Product`, `Review` (PascalCase singular)
- Table name: `users`, `products`, `reviews` (snake_case plural via `@@map`)
- Field: `fullName`, `isActive`, `codeOtp` (camelCase)
- Column: `full_name`, `is_active`, `code_otp` (snake_case via `@map`)
- Optional fields use `?`, never omit nullability
- Use `@db.VarChar(n)` for fixed-length strings (e.g. phone, OTP)
- Always end with a `// — Timestamps —` section containing `createdAt` and `updatedAt`

## Product Schema Decisions

- `Product.province` / `Product.district` / `Product.ward` — structured address fields (not free text) to support location-based filtering and recommendation. Frontend uses [provinces.open-api.vn](https://provinces.open-api.vn) component (3-level: Tỉnh → Quận → Phường). `ward` is optional.
- `Product.price` — `Decimal(12, 0)`, no decimal places (VNĐ has no cents), avoids float rounding errors.
- `Product.rejectedReason` — nullable String; filled by admin when setting status to `REJECTED`.
- `ProductImage.publicId` — Cloudinary public_id stored explicitly to avoid URL parsing on delete.
- `ProductImage.order` — Int for drag-and-drop reordering; `order=0` is the thumbnail shown in feed.
- `ProductImage` uses `onDelete: Cascade` — deleting a product removes all its images automatically.
- `Category` uses self-relation (`"CategoryTree"`) for 2-level hierarchy (parent → children). `parentId = null` means root category.

### Monetization fields

- `Product.expiresAt` — nullable DateTime; only set once a listing reaches `ACTIVE` (based on seller's membership tier duration). Nightly cron flips expired `ACTIVE` listings to `EXPIRED`.
- `Product.boostExpiresAt` — nullable DateTime; `null` means not currently boosted. No separate boost table needed for MVP.
- `Product.renewCount` was considered and dropped — no rule currently consumes it. If a renew limit or a quality-score penalty for repeatedly-renewed listings is added later, reintroduce it alongside that rule (don't add derived counters without a consumer).

### Quality Score & recommendation-engine fields

- `Product.qualityScore` — `Float @default(0)`, updated by recommendation engine, never by user input.
- `Product.viewCount` / `Product.saveCount` — cached aggregate counters, inputs to the Quality Score formula. Not the source of truth for behavior data — see `ProductView` / `SavedProduct` below.
- `SavedProduct` — join table (`@@id([userId, productId])`) for the "save/favorite" button. Real-time toggle (insert on save, delete on unsave); no `updatedAt` since a row only ever exists or doesn't. `Product.saveCount` is a cache = `COUNT(*)` over this table.
- `ProductView` — raw view-event log (`sessionId`, nullable `userId` for anonymous views, `viewedAt`). Feeds two things: (1) `Product.viewCount` via a batch job, not per-request increments, to prevent easy gaming (self-view spam, refresh-spam) — dedupe by `sessionId` + `productId` within a short window, and exclude views where `userId == product.sellerId`; (2) raw behavioral data for session-based recommendation (cold-start).
- Seller-side signals (`avgRating`, `completionRate`, `responseRate` in the Quality Score formula) live on `User`, deferred — see below.

### User: deferred seller-trust fields (placeholder, not yet wired up)

- `User.avgRating`, `User.completionRate`, `User.responseRate` — added to the schema as placeholders (`Float @default(0)`) so the Quality Score formula's field references stay valid, but **no logic writes to them yet**. Each depends on a module/field that doesn't exist yet:
  - `avgRating` — `AVG(rating)` from `Review` (Reviews module)
  - `completionRate` — `soldCount / (soldCount + expiredCount)`, counted directly off `Product.status` for that seller (only listings that reached `SOLD` or `EXPIRED`; `DRAFT`/`PENDING`/`ACTIVE` don't count — their lifecycle isn't finished). No `Order` model involved — see Money Flow. Needs `Product.soldAt` added to schema (nullable DateTime, set when status → `SOLD`) to distinguish "actively sold" from "just expired".
  - `responseRate` — seller reply-within-window ratio from `Chat` (Chat module)
- This is self-reported by the seller (they choose when to mark `SOLD`) and can be gamed downward (lazy seller lets listings expire instead of marking sold) but not meaningfully upward — safer failure mode than a 2-way confirmation.
- Wire up the real update logic when Reviews/Chat are implemented and `Product.soldAt` exists. Until then these stay at `0` for every seller — do not use them for ranking/UI yet.

## Auth Flow

- Register → email verification (OTP code) → login
- Login returns access_token (short-lived) + refresh_token (long-lived, hashed in DB)
- Forgot password: forgot-password → verify-forgot-otp → reset-password
- Google OAuth for social login
- No LocalStrategy/LocalAuthGuard — validation is handled directly in AuthService.validateUser()

## Mail Service

- Package: `nodemailer` with Gmail SMTP
- OTP emails sent during register and password reset
- Fire-and-forget pattern: mail is not awaited, errors are caught and logged
- Gmail App Password required (not account password)

## Cloudinary

- Package: `cloudinary` + `multer` (memoryStorage)
- Folder structure:
  - `fleazo/avatars/` — user avatars
  - `fleazo/products/` — product images
  - `fleazo/categories/` — category icons
- Always delete old image before uploading new one (extract public_id from URL)
- public_id extraction: strip version (`v\d+/`) and extension from URL after `/upload/`

## Key Conventions

### Module structure

All modules follow NestJS standard structure: module / controller / service

### Module config convention

Always use `registerAsync` (not `register`) when a module needs values from `.env`.
This ensures ConfigService is fully loaded before the module initializes:

```typescript
JwtModule.registerAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    secret: config.get<string>('JWT_ACCESS_SECRET'),
    signOptions: {
      expiresIn: (config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m') as any,
    },
  }),
}),
```

## Common Utilities & Decorators

Always check for existing utilities before writing new code:

| Path                                                | Export                            | Use when                                        |
| --------------------------------------------------- | --------------------------------- | ----------------------------------------------- |
| `src/common/utils/hash.util.ts`                     | `hashPassword`, `comparePassword` | argon2 hash/verify                              |
| `src/common/utils/parse-json-array.util.ts`         | `parseJsonArray(raw, field)`      | parse JSON-array field from multipart form-data |
| `src/common/decorators/match.decorator.ts`          | `@Match(field)`                   | cross-field validation                          |
| `src/common/decorators/current-user.decorator.ts`   | `@CurrentUser()`                  | get JWT payload in controller                   |
| `src/common/decorators/roles.decorator.ts`          | `@Roles(...roles)`, `ROLES_KEY`   | restrict endpoint by role                       |
| `src/common/guards/jwt-auth.guard.ts`               | `JwtAuthGuard`                    | require valid access token                      |
| `src/common/guards/refresh-auth.guard.ts`           | `RefreshAuthGuard`                | refresh token endpoint                          |
| `src/common/guards/google-auth.guard.ts`            | `GoogleAuthGuard`                 | Google OAuth callback                           |
| `src/common/guards/roles.guard.ts`                  | `RolesGuard`                      | enforce `@Roles()` (pair with JwtAuthGuard)     |
| `src/common/filters/validation-exception.filter.ts` | `ValidationExceptionFilter`       | global class-validator errors                   |
| `src/common/types/jwt-payload.type.ts`              | `JwtPayload`                      | decoded JWT payload type                        |

> ⚠️ Whenever a new file is added to `src/common/`, update this table immediately.

### DTO convention

- DTOs use `class-validator` decorators for validation
- Every decorator must include a Vietnamese error message:

```typescript
@IsEmail({}, { message: 'Email phải có định dạng hợp lệ' })
@IsNotEmpty({ message: 'Email không được để trống' })
email: string;
```

- **Decorator order matters** — class-validator evaluates decorators bottom-to-top (closest to the property runs first). Place the most important / most fundamental check closest to the property, e.g. existence checks (`@IsNotEmpty`) should be right above the field; type/format checks (`@IsString`, `@IsEmail`, `@IsEnum`) go above that:

```typescript
@IsString({ message: 'Tiêu đề phải là chuỗi ký tự' })
@IsNotEmpty({ message: 'Tiêu đề không được để trống' })
title: string;
```

This runs `@IsNotEmpty` first, then `@IsString`.

### Service function convention

Every service function must annotate each logical step with a numbered comment in **English**:

```typescript
async handleRegister(registerDto: RegisterDto) {
  // 1. Check existing user
  // 2. Hash password
  // 3. Generate OTP
  // 4. Create user
  // 5. Send OTP email
}
```

### Other conventions

- Always use **relative imports** (`../../`) — never `src/` absolute paths
- Prisma enum import path: `../../generated/prisma/client` (not `../../generated/prisma`)
- **Response format**: controllers return the service result directly — no wrapping. Services return plain data or `{ message }` when there is no meaningful data to return. Do NOT wrap responses in `{ statusCode, message, data }` at the controller level.
- snake_case in DB, camelCase in TypeScript code
- ESLint unsafe rules disabled for class-validator decorator patterns
- Password hashing: argon2 (not bcrypt)
- OTP generation: `randomInt` from Node `crypto` (not `Math.random`)
- Date manipulation: `dayjs` (not raw `Date.now()` arithmetic)
- `dotenv/config` imported at top of `main.ts` to load `.env` before NestJS bootstraps
- Use `@CurrentUser()` decorator instead of `@Req() req` to get current user
- Always use `import type` for `ConfigType` due to `isolatedModules`
- `.env` variables must be grouped into named sections using `# ===========================` dividers. When adding new env vars, always create a new named section if one does not exist.

## Current Status

- Core setup: ✅ Done
- Auth module: ✅ Done
- Users module: ✅ Done — get profile, update profile, update avatar, change password, get public profile
- Categories module: ✅ Done — CRUD, icon upload, 2-level hierarchy enforcement (`validateLeafCategory` used by Products for assignment)
- Products module: ✅ Core CRUD done — create (PENDING, requires ≥1 image), create draft (DRAFT, image optional), update (combined text + image add/delete/reorder, atomic), list with filters + pagination, detail (ACTIVE only), admin approve/reject, save/unsave
- Next: pick up one of the deferred items below, or start a new module (Reviews, Membership/Payments, Chat)

### Deferred work — blocked on other modules not built yet

Known gaps, left unimplemented because the blocking module doesn't exist yet. Schema fields may already exist with no service writing to them — expected until the module lands.

- `ProductView` logging + `viewCount` cron aggregation — blocked on: recommendation engine work
- `Product.qualityScore` calculation — blocked on: recommendation engine work
- `User.avgRating` — blocked on: Reviews module
- `User.completionRate` — blocked on: adding `Product.soldAt` to schema (no module dependency — see Money Flow, computed directly from `Product.status`)
- `User.responseRate` — blocked on: Chat module
- Per-tier image limit (`MAX_IMAGES_PER_UPLOAD` is a temporary hard cap of 10) — blocked on: Membership module
- Per-tier `expiresAt` duration on approve (`DEFAULT_LISTING_DURATION_DAYS` is a flat 30-day placeholder) — blocked on: Membership module
- Re-review flow when editing a field on an `ACTIVE` listing — not a missing module, just an undecided rule (which fields should revert status to `PENDING`)
- Seller viewing their own `DRAFT`/`PENDING` listing detail — not built; `GET /products/:id` only returns `ACTIVE`

## Agent Behavior

After completing any meaningful unit of work (feature, fix, refactor, docs update), always provide a suggested commit message at the end of the response. This helps avoid forgotten commits.

Example format:

```
feat(auth): add forgot password flow
```

## Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>
```

**Types:**

- `feat` — new feature
- `fix` — bug fix
- `chore` — config, tooling, dependencies (no logic change)
- `refactor` — code refactor, no new feature or bug fix
- `docs` — documentation changes only
- `test` — add or update tests
- `style` — formatting, lint (no logic change)

**Scope** — related module name (optional but encouraged):
`auth`, `users`, `upload`, `mail`, `products`, `payments`, `chat`, `reviews`, `recommendation`, `chatbot`, `prisma`, `config`

**Examples:**

```
feat(auth): add register endpoint with email OTP verification
fix(auth): handle expired refresh token edge case
chore(prisma): add User model and run initial migration
refactor(products): extract quality scoring into separate service
docs: update AGENTS.md with commit convention
```

**Rules:**

- Subject in English, imperative mood ("add" not "added")
- Do not capitalize the first letter of the subject
- No trailing period in subject
- Subject max 72 characters
