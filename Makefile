SERVICE ?=
TAG ?=

DEV_COMPOSE := ./scripts/compose.sh dev
PROD_COMPOSE := ./scripts/compose.sh prod

.PHONY: up build down restart status logs shell bots-up bots-stop \
	db-prepare db-seed migrate-dev migrate-reset \
	test-unit test-integration bench \
	images-build images-push prod-config deploy prod-status prod-logs \
	prod-bots-up prod-bots-stop clean

# Development
up:
	$(DEV_COMPOSE) up -d --wait postgres redis
	./scripts/database.sh dev prepare
	$(DEV_COMPOSE) up -d --wait backend engine worker

build:
	$(DEV_COMPOSE) build backend engine worker

down:
	$(DEV_COMPOSE) down --remove-orphans

restart:
	$(DEV_COMPOSE) restart backend engine worker

status:
	$(DEV_COMPOSE) ps

logs:
	$(DEV_COMPOSE) logs -f $(SERVICE)

shell:
	@if [ -z "$(SERVICE)" ]; then echo "Set SERVICE, for example: make shell SERVICE=backend" >&2; exit 1; fi
	$(DEV_COMPOSE) exec $(SERVICE) sh

bots-up: up
	$(DEV_COMPOSE) --profile bots up -d --build btc-bot sol-bot eth-bot

bots-stop:
	$(DEV_COMPOSE) --profile bots stop btc-bot sol-bot eth-bot

# Database
db-prepare:
	./scripts/database.sh dev prepare

db-seed:
	./scripts/database.sh dev seed

migrate-dev:
	$(DEV_COMPOSE) exec backend bun prisma migrate dev

migrate-reset:
	$(DEV_COMPOSE) exec backend bun prisma migrate reset

# Test
test-unit:
	cd backend && set -a && . ../.env.test && set +a && bun test
	cd engine && set -a && . ../.env.test && set +a && bun test

test-integration:
	sh tests/run-integration.sh

bench:
	sh benchmarks/run.sh

# Release images
images-build:
	./scripts/images.sh build "$(TAG)"

images-push:
	./scripts/images.sh push "$(TAG)"

# Production
prod-config:
	$(PROD_COMPOSE) config --quiet

deploy:
	./scripts/deploy.sh

prod-status:
	$(PROD_COMPOSE) ps

prod-logs:
	$(PROD_COMPOSE) logs -f $(SERVICE)

prod-bots-up:
	$(PROD_COMPOSE) --profile bots pull btc-bot sol-bot eth-bot
	$(PROD_COMPOSE) --profile bots up -d btc-bot sol-bot eth-bot

prod-bots-stop:
	$(PROD_COMPOSE) --profile bots stop btc-bot sol-bot eth-bot

clean:
	$(DEV_COMPOSE) down --volumes --remove-orphans
