# Fleazo Backend — AGENTS.md

## Project Overview

Fleazo is a student secondhand marketplace platform built for Vietnamese university students.
It includes a recommendation engine (session-based + content-based + quality scoring)
and an AI-powered shopping chatbot as the core thesis novelty.

## Tech Stack

- Runtime: Node.js with NestJS framework
- Language: TypeScript
- Database: PostgreSQL via Prisma ORM
- Auth: JWT (access + refresh token rotation) + Google OAuth
- Payment: PayOS
- Realtime: WebSocket (chat between buyer and seller)

## Project Structure

src/
├── modules/
│ ├── auth/ # JWT auth, Google OAuth, email verification, OTP reset
│ ├── users/ # User profile, avatar upload
│ ├── products/ # CRUD listings, image upload, quality scoring
│ ├── categories/ # Product categories
│ ├── orders/ # Transactions, PayOS webhook
│ ├── chat/ # Realtime WebSocket chat
│ ├── reviews/ # Rating and review after transaction
│ ├── recommendation/ # Session-based + content-based recommendation engine
│ └── chatbot/ # LLM-powered shopping assistant (function calling)
├── common/
│ ├── decorators/ # Custom decorators (e.g. @CurrentUser)
│ ├── guards/ # Auth guards (JwtAuthGuard, RolesGuard)
│ ├── filters/ # Global exception filters
│ ├── interceptors/ # Response transform interceptor
│ └── pipes/ # Validation pipes
├── config/ # App config, env validation
├── prisma/ # PrismaService, PrismaModule
└── main.ts

## Database

- ORM: Prisma
- DB: PostgreSQL
- Naming convention: snake_case for DB columns, camelCase in TypeScript (via @map)
- Migration command: npx prisma migrate dev --name <migration_name>

## Auth Flow

- Register → email verification (OTP code) → login
- Login returns access_token (short-lived) + refresh_token (long-lived, hashed in DB)
- Google OAuth for social login
- Password reset via OTP sent to email

## Key Conventions

- All modules follow NestJS standard structure: module / controller / service
- DTOs use class-validator decorators for validation
- Responses are wrapped in a standard format: { statusCode, message, data }
- Environment variables are validated at startup via Joi or class-validator
- snake_case in DB, camelCase in TypeScript code

## Current Status

Setting up from scratch. Auth module is the first to be built.
