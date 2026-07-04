FROM oven/bun:1 AS base

WORKDIR /usr/src/app/

FROM base AS dev

COPY package.json .
COPY bun.lock .

RUN bun install
COPY . .

RUN bun prisma generate

CMD [ "bun", "run", "dev" ]

FROM base AS builder

COPY package.json .
COPY bun.lock .

RUN bun install --frozen-lockfile
COPY . .

RUN bun prisma generate
RUN bun run build

FROM base AS runner

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package.json ./package.json
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/generated ./generated
COPY --from=builder /usr/src/app/prisma.config.ts ./prisma.config.ts

EXPOSE 8000

CMD ["bun", "run", "start"]