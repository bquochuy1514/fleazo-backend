# Fleazo Backend — AGENTS.md

> **Repo:** `fleazo-backend` — NestJS backend only.
> Frontend lives in `fleazo-frontend`, AI service in `fleazo-ai` (Python FastAPI, not yet started).

## Project Overview

Fleazo is a student secondhand marketplace platform built for Vietnamese university students.
Core AI-related features: an AI-powered shopping chatbot (function-calling into product
search, scope under review — see AI Chatbot section) and an LLM-based listing quality/
condition assessment (reads a listing's images + Vietnamese description, scores how well
it conveys the item's real condition, and surfaces missing info back to the seller).
No recommendation engine (session-based, content-based, or collaborative filtering) —
dropped; see Listing Quality & AI Chatbot section for why.

Thesis status: undecided again as of 19 July. Huy previously decoupled this
repo from his graduation thesis, then reconsidered — Fleazo may become the thesis subject
after all if the feature set (especially AI Chatbot / Quality Score) is strong enough.
Do not assume either direction; don't reintroduce "novelty"-driven scope cuts without
Huy explicitly confirming thesis is back on, and don't strip thesis-relevant depth either
until he decides. Fleazo stays production-quality regardless of thesis outcome.

## Product Vision

Fleazo is being built with two goals simultaneously:

1. **Real product** — ship to actual Vietnamese university students, production-ready
2. **Revenue-generating** — monetize through listing services and membership tiers

**Never cut features for the sake of scope reduction.** Always design and implement for production quality and completeness.

### Monetization model

> ⚠️ Parameters below are tentative and subject to change. Do not hardcode these values — they should be configurable.

**Membership tiers (subscription):** 3 tiers — Free / Basic / Premium

- Free: 3 active listings at a time, listings expire after 30 days, max 3 images per listing
- Basic: more active listings, longer expiry, more images per listing (exact limits TBD)
- Premium: even higher limits (exact limits TBD)

**Boost (one-time, per listing):** pay to push a listing to the top of the feed

- Multiple duration options (e.g. 24h / 48h / 72h) at different price points (TBD)
- Boosted listings get a temporary priority score bump on top of `qualityScore`, but quality score still applies (no pure pay-to-win)
- Payment via PayOS

**Extend listing (one-time, per listing):** pay to renew an expired listing without re-posting

- Preserves listing history, saved-by-users, and chat context
- Flat fee per renewal (TBD)

## Money Flow — what PayOS does and does NOT cover

**PayOS handles (money → Fleazo):** Membership subscription, Boost, Extend. These are the only real payments in the system.

**PayOS does NOT handle product sales (buyer ↔ seller).** Money moves directly between buyer and seller outside the app (cash on meetup, direct transfer) — Fleazo never touches it:

- **Legal**: holding and releasing buyer funds is an intermediary-payment activity requiring an NHNN license, which Fleazo doesn't have.
- **Technical**: PayOS is a single-merchant collector, not a marketplace payout system — no built-in per-seller split/hold.
- **Behavioral**: student trades are mostly in-person campus meetups; forcing in-app payment before meetup adds friction and pushes users off-platform.

**Consequence: no `Order` model.** A 2-way confirmation was considered and dropped — with no money custody, the app can never verify a trade happened, so confirmation adds complexity without adding trust.

- Seller marks a listing `SOLD` directly on `Product` (single action — see `completionRate` in Product Schema Decisions).
- `Product.status` (`SOLD` vs `EXPIRED`) is the only signal the system trusts for "did this seller actually sell things."
- **`CANCELLED`** — a separate status for a seller voluntarily pulling a still-live listing (`DRAFT`/`PENDING`/`ACTIVE`) for reasons other than a sale (changed mind, sold off-platform without marking `SOLD`, etc). One-way, no "un-cancel" — sellers re-list instead. Excluded from `completionRate`'s numerator and denominator entirely (neither counted as a success nor a failure — an unverifiable off-platform sale shouldn't be penalized as if the listing failed to sell).
- **`Product` rows are never hard-deleted** — only status changes (including `BANNED`, `CANCELLED`). This keeps `Review.productId` always valid; no delete endpoint exists or should be built without revisiting this.

## Reviews — seller reputation, not product reviews

Reviews rate **the seller** (`User.avgRating`), not the product — every listing is a unique secondhand item sold once, so there's no "review this exact listing for future buyers" case like Shopee/Tiki. What matters is "is this seller trustworthy," a property of the person.

Design modeled after Chợ Tốt (a real large-scale C2C marketplace with the same no-money-custody constraint), which solves the same verification problem via policy/moderation instead of a hard technical gate — with two deliberate departures explained below.

- **One-way only (buyer → seller)**: a reverse "seller reviews buyer" was considered and dropped. Nothing in Fleazo consumes a buyer-role rating (Quality Score only reads seller `avgRating`), so it would add a "block dishonest reviews" benefit that's smaller than the complexity it drags in (role-tagging every review, recalculating who's a buyer vs seller per transaction). Not worth it at this stage.
- **Loose gate**: a buyer can review a seller if there's a `Message` between them (in their shared `Conversation`, regardless of which of them started it) referencing that `productId` — no proof the trade completed. This mirrors Chợ Tốt's own Terms, which count "any case where the buyer voluntarily interacted with the seller's listing (call button, message button, sent a message...)" as sufficient grounds for review — not just a completed sale (their list even includes met-but-didn't-buy, no-show, paid-but-not-received). Trades that skip in-app chat entirely (Zalo/Facebook) can't be reviewed; accepted gap. See Chat section for why the check is on `Message.productId`, not on `Conversation` itself.
- **One review per buyer–seller pair, ever**: enforced by `@@unique([reviewerId, sellerId])`. If the same buyer buys from the same seller again, the review is **upserted** (rating/comment/productId overwritten to reflect the latest experience), not duplicated — otherwise a buyer who purchases repeatedly from one seller would inflate that seller's review count without representing distinct trust signals.
- **Immutable once submitted** (aside from the upsert-on-repeat-purchase case above): no edit API for `rating`/`comment` after creation, matching Chợ Tốt's rule that neither party can alter a review after the fact.
- **Seller can reply once**: `sellerReply` is a single nullable field, not a list — inherently caps it at one reply per review, and the reply itself is also immutable once set.
- **No pre-publish delay — reviews go live immediately.** Confirmed against Chợ Tốt's actual published Terms (Quy định sử dụng Tính năng Đánh giá, effective 15/10/2019): there is no hold period before a review is shown; Chợ Tốt's own wording is reviews get taken down reactively ("gỡ bỏ mà không cần thông báo trước") on violation/report, never held back pre-publish. A delay was originally added here to prevent retaliatory counter-reviews, but that only made sense for two-way reviews — now that reviews are one-way (buyer → seller, see above), there's no counter-review for a delay to protect against, so it was dropped. No cron job, no `isPublished` field.
- **Report + hide** after the fact, same as Chợ Tốt — reviews are taken down reactively (not pre-screened) if reported/found to violate rules (harassment, personal info, off-topic content, fake/competitor brigading, etc. — see Chợ Tốt's Terms for the reference category list). No `reportCount`/report table yet; `isHidden` is admin-set manually until a general-purpose reporting feature exists.

`Review` schema: `reviewerId`, `sellerId`, `productId` (grounds the gate check), `rating` (1–5), `comment`, `sellerReply`, `isHidden` (default `false`, admin-set on report), unique on `(reviewerId, sellerId)`.

## Chat — scope and design

**MVP scope — what's in:**

- Direct 1-to-1 messaging, realtime via WebSocket
- Last-message preview + timestamp on the conversation list
- Unread count (`Message.isRead`)
- Read receipts ("seen")
- Message recall (`Message.isRecalled`) — sender can retract a sent message; content stays in the DB (soft-hide only) so it isn't lost, frontend just renders "message recalled" in place of `content` when true
- Pagination for loading older messages
- Online/offline status, notified only to conversation partners (not a global presence list — see below for both halves of this design)

**Online status has two separate decisions — don't conflate them:**

1. **Who gets notified** (audience): only users who already share a `Conversation` with the person going online/offline — computed via `getPartnerIds`, mirrors the "no friend system" decision above. Not broadcast to every connected user.
2. **When the socket connects** (lifecycle): the frontend opens the Socket.IO connection once, app-wide, as soon as the user is logged in — not only when they open the Chat page/route. Chosen over "only connect while on the Chat page" because Fleazo is primarily a browsing marketplace; sellers are online (and shown as such) while browsing listings too, not only while actively chatting — the online indicator is meant to signal "likely to respond right now" (like Messenger's "Active now"), which is only useful if it reflects general app presence, not just chat-tab presence. Implication for the frontend: the socket connection lives in a top-level provider/layout, not inside the Chat page component.

**No message editing** — deliberately not offered, even though recall is. In a negotiation context (haggling over price, agreeing on a meetup), editing lets either side quietly rewrite what was actually said ("I said 2 million" vs a since-edited message), which undermines chat as a record either party can point back to in a dispute. Recall is safer: it visibly marks that something was retracted rather than silently rewriting history. Messages are otherwise immutable once sent.

**Reviews gate must not filter out recalled messages.** The gate check (see Reviews section) queries `Message.productId` to confirm two people discussed a given product — that fact is still true even if the message's content was later recalled. Do not add `isRecalled: false` to the gate query; that condition belongs only to whatever renders message content for display.

**Explicitly cut, and why:**

- **Friend system (requests, accept/decline, username search, friends list)** — this is a social-network feature, not a marketplace one. No C2C platform (Chợ Tốt, Shopee, Facebook Marketplace) has a friending layer, because trades are one-off transactions, not a persistent social graph. There's also no `username` field on `User` to search by — adding one just for this would be scope creep with no other consumer.
- **Group chat (>2 participants)** — would require replacing `Conversation.initiatorId`/`recipientId` with a join table (`ConversationParticipant`), a real architecture change. No use case identified for group negotiation over a single secondhand item; revisit only if a real need shows up (e.g. splitting a group purchase).
- **Image/file attachments in chat** — reasonable for a marketplace (buyer asking for another photo angle), but adds Cloudinary upload into the realtime flow on the very first chat implementation. Deferred to a later pass once basic realtime messaging is solid.
- **Message reactions** — nice-to-have, no bearing on the core buy/sell flow. Deferred, no urgency.

**Conversation is per-pair, not per-product.** Modeled after Chợ Tốt: two people have exactly one thread total, reused across every product they ever discuss — not a new thread per listing. This matches how people actually expect chat to work (Messenger/Zalo also have one thread per pair) and avoids fragmenting a buyer-seller relationship across N separate threads.

- `Conversation.initiatorId`/`recipientId` name the two participants, **not** buyer/seller — those roles aren't fixed for a pair over time (the same two people can each sell to the other on different occasions), so the field names deliberately avoid implying a fixed role.
- `Message.productId` (nullable) carries "which listing this message is about" instead — this is what makes the Reviews gate check still work: to confirm reviewer/seller-being-reviewed actually exchanged messages about a specific product, cross-reference `Message.productId` against `Product.sellerId` (the only source of truth for who's the seller of that product), rather than trusting anything on `Conversation`.
- No unique DB constraint enforces "one conversation per pair" — Prisma can't express "unordered pair uniqueness" directly (a `(initiatorId, recipientId)` unique index doesn't catch the reversed pair). The service layer must check both directions (`OR: [{initiatorId: A, recipientId: B}, {initiatorId: B, recipientId: A}]`) before creating a new conversation.

### WebSocket event contract

`ChatGateway` uses **Socket.IO** (not raw WebSocket — the client must use `socket.io-client`, protocols aren't compatible). Auth token goes in `io(url, { auth: { token } })` at connect time; `handleConnection` rejects (disconnects) anything without a valid token before any event handler can fire.

**Client → Server (emit):**

| Event              | Payload                                   |
| ------------------ | ----------------------------------------- |
| `joinConversation` | `{ conversationId }`                      |
| `sendMessage`      | `{ conversationId, content, productId? }` |
| `recallMessage`    | `{ messageId }`                           |

- `joinConversation`: joins the `conversation:<id>` room, marks the sender's messages as read, returns `{ otherUserOnline }` as an ack.
- `sendMessage`: persists the message, broadcasts `newMessage` to the room and `newMessageNotification` to the recipient.
- `recallMessage`: sets `isRecalled = true`, broadcasts `messageRecalled` to the room.

**Server → Client (on):**

| Event                        | Payload                                          |
| ---------------------------- | ------------------------------------------------ |
| `newMessage`                 | full `Message` row                               |
| `newMessageNotification`     | `{ conversationId, latestMessage, unreadCount }` |
| `messagesRead`               | `{ conversationId, readerId }`                   |
| `messageRecalled`            | `{ messageId }`                                  |
| `userOnline` / `userOffline` | `{ userId }`                                     |

- `newMessage`: fires for anyone in the `conversation:<id>` room you've joined.
- `newMessageNotification`: fires for **any** of your conversations, joined or not — this is what should drive the inbox badge/preview while browsing outside the Chat page.
- `messagesRead`: the other person just opened the conversation and read your messages.
- `messageRecalled`: a message in a room you've joined was recalled.
- `userOnline` / `userOffline`: someone you share a conversation with connected/disconnected (audience explained below).

Room naming: `conversation:<id>` (joined explicitly via `joinConversation`) and `user:<id>` (joined automatically on connect, for anything that must reach a person regardless of which conversation they have open).

**Two things not yet production-ready — revisit before deploying:**

- `cors: { origin: '*' }` on `@WebSocketGateway` accepts connections from any domain — fine for local dev, must be restricted to the real `fleazo-frontend` origin before production.
- `onlineUsers` is an in-memory `Set` on the Gateway instance — resets on server restart and only works correctly with a single backend instance. A multi-instance deployment would need a shared store (e.g. Redis) instead; not needed at current scale.

## Tech Stack

- Runtime: Node.js with NestJS framework
- Language: TypeScript
- Database: PostgreSQL via Prisma ORM (v7)
- Auth: JWT (access + refresh token rotation) + Google OAuth
- Payment: PayOS
- Realtime: **Socket.IO** (`socket.io` + `@nestjs/websockets`/`@nestjs/platform-socket.io`) — not raw WebSocket; frontend must use `socket.io-client`, protocols aren't interchangeable. 1-to-1 chat, not scoped to only buyer/seller roles — see Chat section
- Email: Nodemailer with Gmail SMTP
- File storage: Cloudinary (avatars, product images)
- Address API: [provinces.open-api.vn](https://provinces.open-api.vn) `/api/v2/` — free, no API key required. 2-level structure (Tỉnh/Thành phố → Phường/Xã) since Vietnam's July 2025 administrative merger abolished the district level — do not use `/api/v1/` (pre-merger, 3-level, obsolete)

## Listing Quality & AI Chatbot

No recommendation engine (session-based, content-based filtering, or collaborative
filtering) — considered and dropped. It was originally planned as the thesis novelty
argument, but the thesis is now decoupled from this repo (see Project Overview), and a
personalized/session-tracked recommendation system isn't needed for Fleazo as a product —
plain filtering (category/price/location/condition, already in `QueryProductDto`) covers
real user needs without the added complexity of behavior tracking, cold-start tiering, etc.

### Quality Score

Every listing gets a `Product.qualityScore` used for basic feed ordering (not
personalized — same score for every viewer). Simplified down from an earlier 9-signal
weighted formula to just two components:

| Signal                     | Formula / source               |
| -------------------------- | ------------------------------ |
| Condition-confidence score | LLM call (image + description) |
| Freshness                  | `max(1 - daysOld / 30, 0)`     |

- **Condition-confidence score**: LLM call (multimodal — images + Vietnamese description) scoring how well the listing content conveys the item's real condition. Also surfaces `missingInfo` (e.g. "chưa nêu tình trạng pin") back to the seller as actionable feedback — this is the useful part beyond just a number. Not yet implemented — see Deferred work.
- **Freshness**: decays over the listing's active window.

> ⚠️ Exact blend/weighting between the two is undecided — don't hardcode until the LLM piece is actually built and can be tuned against real data.

**Boost multiplier (monetization integration):**

```
effectiveScore = qualityScore × (isCurrentlyBoosted ? 1.5 : 1.0)
```

Boosted listings get a temporary score bump, but quality score still applies — no pure pay-to-win.

**Quality Score is recalculated on:**

- Seller updates listing (images, description) — triggers a fresh LLM condition-confidence call
- `Product.status` changes to `SOLD` or `EXPIRED` (feeds seller `completionRate` — see Money Flow)
- Nightly cron job (for freshness decay)

Score is stored in `Product.qualityScore` and read at query time via `ORDER BY effectiveScore DESC`.

### AI Chatbot with Function Calling

User describes what they want in natural language → chatbot calls real functions into product search (plain filtering, not a recommendation engine) → returns actual listings. Implemented in `fleazo-ai` (Python FastAPI, future service).

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
│   ├── products/         # CRUD listings, image upload, LLM-based quality scoring (see Listing Quality & AI Chatbot section)
│   ├── categories/       # Product categories
│   ├── payments/         # PayOS transactions for Membership / Boost / Extend (NOT product sales — see Money Flow)
│   ├── chat/             # 1-to-1 realtime WebSocket chat (Conversation/Message) — see Chat section
│   ├── reviews/          # Seller reputation (User.avgRating), gated by an existing Chat Conversation on the listing — see Reviews section
│   └── chatbot/          # LLM-powered shopping assistant, function-calling into plain product search (no recommendation engine)
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

## Location Fields — User & Product

Vietnam's administrative merger (July 2025) collapsed the old 3-level structure (Tỉnh → Huyện → Xã) into 2 levels (Tỉnh/Thành phố → Phường/Xã), abolishing the district tier entirely. `provinces.open-api.vn`'s `/api/v2/` reflects this — it returns only province and ward, no district. Schema follows the new 2-level structure.

Both `User` and `Product` carry their own independent set of 4 location fields (`provinceCode`, `provinceName`, `wardCode`, `wardName`) — **not a shared `Address` model**. A user's home location and a listing's location are unrelated facts about two different entities (a seller can live in one district and list an item stored elsewhere); a shared/polymorphic `Address` table would need an artificial owner-discriminator or two nullable FKs for no real benefit, since neither side needs to query "all addresses" as a cross-cutting resource. Duplicating these 4 scalar columns across models is the same pattern already used for `createdAt`/`updatedAt` on every model — not denormalization to worry about.

- Both `code` and `name` are stored (not just the human-readable name) — Vietnamese place names have diacritics/formatting variants that make string-based filtering unreliable; `code` from the API is used for exact filtering/matching, `name` is cached purely for display so the app never has to re-hit the external API to render a listing or profile.
- No local mirror table for the full province/ward reference list — that data barely changes and the frontend calls `provinces.open-api.vn` directly for the picker dropdown. Backend only ever stores the _result_ of a selection, not the reference data itself.
- `Product`'s fields are required (every listing must have a location). `User`'s fields are nullable (optional profile info, feeds a future "listings near you" feature — not yet built, but worth capturing on profile now since it's cheap and the frontend will have a location picker anyway for Products).

## Product Schema Decisions

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

### Quality Score fields

- `Product.qualityScore` — `Float @default(0)`, updated by the listing quality logic (see Listing Quality & AI Chatbot section), never by user input.
- `Product.saveCount` — cached aggregate counter (not currently a Quality Score input — the formula was simplified down to condition-confidence + freshness only, see that section). Not the source of truth for behavior data — see `SavedProduct` below.
- `SavedProduct` — join table (`@@id([userId, productId])`) for the "save/favorite" button. Real-time toggle (insert on save, delete on unsave); no `updatedAt` since a row only ever exists or doesn't. `Product.saveCount` is a cache = `COUNT(*)` over this table.
- Seller-side trust signals (`avgRating`, `completionRate`, `responseRate`) live on `User`, deferred — see below. Not currently Quality Score inputs (dropped along with the old 9-signal formula); still useful for display on seller profile / future features.

### User: deferred seller-trust fields (placeholder, not yet wired up)

`User.avgRating`, `User.completionRate`, `User.responseRate` — `Float @default(0)` placeholders for seller trust display (profile, future features); no logic writes to them yet:

- `avgRating` — `AVG(rating)` from published `Review`s (Reviews module; gate rule in the Reviews section)
- `completionRate` — `soldCount / (soldCount + expiredCount)`, plain `COUNT(*) ... GROUP BY status` on `Product` per seller, only `SOLD`/`EXPIRED` listings (see Money Flow)
- `responseRate` — seller reply-within-window ratio computed from `Message` timestamps. Chat module now exists (see Chat section), but no aggregation logic reads it into this field yet — still a genuine gap, just no longer blocked on missing infrastructure

Stay at `0` for every seller until the respective modules land — don't use for ranking/UI yet.

## Auth Flow

- Register → email verification (OTP code) → login
- Login returns access_token (short-lived) + refresh_token (long-lived, hashed in DB)
- Forgot password: forgot-password → verify-forgot-otp → reset-password
- Google OAuth for social login
- No LocalStrategy/LocalAuthGuard — validation is handled directly in AuthService.validateUser()
- `phone` stays optional, unverified (unlike Chợ Tốt, which requires phone verification to post listings). Reasons: Fleazo is a closed university-student community, not an open nationwide marketplace, so fake-account risk is lower; and phone OTP requires a paid SMS gateway, unlike the free Gmail SMTP already used for email OTP — not worth the added cost/friction without evidence of a real spam problem. Revisit if that changes.
- **Error codes**: every auth exception the frontend needs to branch on (not just display) carries a stable `errorCode` (see `src/common/constants/error-code.constant.ts`) alongside `message` — frontend must branch only on `errorCode`, never on `message` text, which can be reworded freely. `validateUser`'s "email not found" and "wrong password" cases deliberately share one code (`INVALID_CREDENTIALS`) — don't split them, that would let an attacker enumerate registered emails via response codes even with an identical message.
- ⚠️ `ValidationExceptionFilter` only catches `BadRequestException` (`@Catch(BadRequestException)`). `UnauthorizedException`/`ForbiddenException` throws bypass it and fall through to Nest's default handling — passing an object body (`{ message, errorCode }`) there returns it as-is, without the `statusCode`/`error` fields Nest auto-adds for a plain string body. Frontend doesn't read those fields so it's harmless today, but 400 vs 401/403 responses are not guaranteed to share an identical shape — don't assume so when adding new throws.

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
| `src/common/guards/ws-jwt.guard.ts`                 | `WsJwtGuard`                      | require `client.data.user` to exist (WebSocket) |
| `src/common/filters/validation-exception.filter.ts` | `ValidationExceptionFilter`       | global class-validator errors                   |
| `src/common/types/jwt-payload.type.ts`              | `JwtPayload`                      | decoded JWT payload type                        |
| `src/common/constants/error-code.constant.ts`       | `ErrorCode`                       | throwing an exception frontend must branch on   |

> ⚠️ Whenever a new file is added to `src/common/`, update this table immediately.

`WsJwtGuard` doesn't verify the JWT itself — that happens once in `ChatGateway.handleConnection`. It's a lightweight re-check, paired with `@SubscribeMessage` handlers, that `client.data.user` is still set.

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
- Users module: ✅ Done — get profile, update profile (incl. optional location fields), update avatar, change password, get public profile (shows province/ward, not `addressDetail`)
- Categories module: ✅ Done — CRUD, icon upload, 2-level hierarchy enforcement (`validateLeafCategory` used by Products for assignment)
- Products module: ✅ Core CRUD done — create (PENDING, requires ≥1 image), create draft (DRAFT, image optional), update (combined text + image add/delete/reorder, atomic), list with filters + pagination, detail (ACTIVE only), admin approve/reject, save/unsave. Location fields migrated to the 2-level `provinceCode`/`provinceName`/`wardCode`/`wardName`/`addressDetail` structure (see Location Fields section) — `province`/`district`/`ward` no longer exist.
- Reviews: ⚠️ **Design only** — `Review` model exists in schema, full gating/moderation design documented above, but `ReviewsController`/`ReviewsService` are not implemented yet.
- Chat module: ✅ Done — REST (`ChatController`/`ChatService`: create/get conversation, list conversations, paginated message history) + WebSocket (`ChatGateway`: join, send, recall, read receipts, online/offline, cross-conversation notifications) — see Chat section for the full event contract.
- Next: pick up Reviews (schema is ready, just needs Controller/Service), one of the deferred items below, or start `fleazo-frontend`.

### Deferred work — blocked on other modules not built yet

Known gaps, left unimplemented because the blocking module doesn't exist yet. Schema fields may already exist with no service writing to them — expected until the module lands.

- `Product.qualityScore` calculation (LLM condition-confidence call + freshness) — blocked on: `fleazo-ai` service work
- `User.avgRating` / `User.completionRate` / `User.responseRate` — see Product Schema Decisions → User: deferred seller-trust fields
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
`auth`, `users`, `upload`, `mail`, `products`, `payments`, `chat`, `reviews`, `chatbot`, `prisma`, `config`

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
