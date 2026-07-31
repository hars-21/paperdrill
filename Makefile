ENV ?= dev

DEV_FILE := -f compose.dev.yml
PROD_FILE := -f compose.prod.yml
BOT_FILE := -f bot/compose.yml

ifeq ($(ENV),dev)
COMPOSE := docker compose $(DEV_FILE)
endif

ifeq ($(ENV),prod)
COMPOSE := docker compose $(PROD_FILE)
endif

ifeq ($(ENV),bot)
COMPOSE := docker compose $(BOT_FILE)
endif

.PHONY: up build down start stop logs migrate-dev migrate-reset migrate-deploy seed clean

up:
	$(COMPOSE) up -d

build:
	$(COMPOSE) up --build -d

down:
	$(COMPOSE) down

start:
	$(COMPOSE) start

stop:
	$(COMPOSE) stop

logs:
	$(COMPOSE) logs -f

migrate-dev:
	$(COMPOSE) exec backend bun prisma migrate deploy

migrate-reset:
	$(COMPOSE) exec backend bun prisma migrate reset

migrate-deploy:
	$(COMPOSE) exec backend bun prisma migrate deploy

seed:
	$(COMPOSE) exec backend bun prisma db seed

clean:
	docker system prune -f
