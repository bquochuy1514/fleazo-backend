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
- Email: Nodemailer with Gmail SMTP
- File storage: Cloudinary (avatars, product images)

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
│   ├── orders/           # Transactions, PayOS webhook
│   ├── chat/             # Realtime WebSocket chat
│   ├── reviews/          # Rating and review after transaction
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

- Model name: `User`, `Product`, `Order` (PascalCase singular)
- Table name: `users`, `products`, `orders` (snake_case plural via `@@map`)
- Field: `fullName`, `isActive`, `codeOtp` (camelCase)
- Column: `full_name`, `is_active`, `code_otp` (snake_case via `@map`)
- Optional fields use `?`, never omit nullability
- Use `@db.VarChar(n)` for fixed-length strings (e.g. phone, OTP)
- Always end with a `// — Timestamps —` section containing `createdAt` and `updatedAt`

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

| Path                                              | Export                            | Use when                                        |
| ------------------------------------------------- | --------------------------------- | ----------------------------------------------- |
| `src/common/utils/hash.util.ts`                   | `hashPassword`, `comparePassword` | Hash or verify passwords with argon2            |
| `src/common/decorators/match.decorator.ts`        | `@Match(field)`                   | Cross-field validation (e.g. confirmPassword)   |
| `src/common/decorators/current-user.decorator.ts` | `@CurrentUser()`                  | Extract JWT payload from request in controllers |

### DTO convention

- DTOs use `class-validator` decorators for validation
- Every decorator must include a Vietnamese error message:

```typescript
@IsEmail({}, { message: 'Email phải có định dạng hợp lệ' })
@IsNotEmpty({ message: 'Email không được để trống' })
email: string;
```

### Service function convention

Every service function must annotate each logical step with a numbered comment:

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

- Responses wrapped in standard format: `{ statusCode, message, data }`
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
- Next: Products module

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
`auth`, `users`, `upload`, `mail`, `products`, `orders`, `chat`, `recommendation`, `chatbot`, `prisma`, `config`

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
