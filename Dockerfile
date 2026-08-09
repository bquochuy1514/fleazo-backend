# node:*-slim (Debian/glibc), not alpine — avoids Prisma's musl/openssl
# binary-target headaches on an image nobody's pinned binaryTargets for.

FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Must run before `nest build` — PrismaService imports the generated client
# from src/generated/prisma, which only exists after this.
RUN npx prisma generate
RUN npm run build

FROM node:22-slim AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
EXPOSE 8080
# dist/src/main.js, not dist/main.js — see package.json's start:prod comment.
CMD ["node", "dist/src/main.js"]
