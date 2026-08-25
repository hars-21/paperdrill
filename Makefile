ENV ?= dev

DEV_FILE := compose.dev.yml
PROD_FILE := compose.prod.yml
BOT_FILE := compose.bot.yml

ifeq ($(ENV),dev)
COMPOSE := docker compose -f $(DEV_FILE)
endif

ifeq ($(ENV),prod)
COMPOSE := docker compose -f $(PROD_FILE)
endif

ifeq ($(ENV),bot)
COMPOSE := docker compose -f $(BOT_FILE)
endif

.PHONY: up build down deploy start restart stop status logs migrate-dev migrate-reset migrate-deploy seed clean

up:
	$(COMPOSE) up -d

build:
	$(COMPOSE) build

down:
	$(COMPOSE) down

deploy:
	$(COMPOSE) up -d --build

start:
	$(COMPOSE) start

restart:
	$(COMPOSE) restart

stop:
	$(COMPOSE) stop

status:
	$(COMPOSE) ps

logs:
	$(COMPOSE) logs -f $(SERVICE)

migrate-dev:
	$(COMPOSE) exec backend bun prisma migrate dev

migrate-reset:
	$(COMPOSE) exec backend bun prisma migrate reset

migrate-deploy:
	$(COMPOSE) exec backend bun prisma migrate deploy

db-seed:
	$(COMPOSE) exec backend bun prisma db seed

clean:
	docker system prune -f
