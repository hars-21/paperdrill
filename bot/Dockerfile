FROM oven/bun:1 AS base

WORKDIR /usr/src/app/

COPY package.json .
COPY bun.lock .

RUN bun install --frozen-lockfile

COPY . .

CMD [ "bun", "run", "start" ]
