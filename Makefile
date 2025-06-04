# MarineAI - Comprehensive Project Makefile
# This Makefile provides commands for development, testing, deployment, and maintenance

# Shell settings
SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c
.ONESHELL:

# Detect operating system
ifeq ($(OS),Windows_NT)
	DETECTED_OS := Windows
else
	DETECTED_OS := $(shell uname -s)
endif

# Define standard colors
RESET := $(shell tput sgr0 2>/dev/null || echo '')
BOLD := $(shell tput bold 2>/dev/null || echo '')
RED := $(shell tput setaf 1 2>/dev/null || echo '')
GREEN := $(shell tput setaf 2 2>/dev/null || echo '')
YELLOW := $(shell tput setaf 3 2>/dev/null || echo '')
BLUE := $(shell tput setaf 4 2>/dev/null || echo '')
MAGENTA := $(shell tput setaf 5 2>/dev/null || echo '')
CYAN := $(shell tput setaf 6 2>/dev/null || echo '')

# Project directories
ROOT_DIR := $(CURDIR)
FRONTEND_DIR := $(ROOT_DIR)/frontend
BACKEND_DIR := $(ROOT_DIR)/backend
AI_SERVICE_DIR := $(ROOT_DIR)/ai-service
DOCS_DIR := $(ROOT_DIR)/docs
K8S_DIR := $(ROOT_DIR)/k8s

# Docker settings
DOCKER_COMPOSE := docker-compose
DOCKER_COMPOSE_FILE := $(ROOT_DIR)/docker-compose.yml
DOCKER_COMPOSE_DEV_FILE := $(ROOT_DIR)/docker-compose.dev.yml
DOCKER_COMPOSE_PROD_FILE := $(ROOT_DIR)/docker-compose.prod.yml
DOCKER_COMPOSE_TEST_FILE := $(ROOT_DIR)/docker-compose.test.yml

# Environment variables
ENV_FILE := $(ROOT_DIR)/.env
ENV_EXAMPLE_FILE := $(ROOT_DIR)/.env.example
ENV_DEV_FILE := $(ROOT_DIR)/.env.development
ENV_STAGING_FILE := $(ROOT_DIR)/.env.staging
ENV_PROD_FILE := $(ROOT_DIR)/.env.production

# Docker image names and tags
REGISTRY := ghcr.io
REPO_NAME := viktoria-secret/marine-ai
VERSION := $(shell git describe --tags --always --dirty 2>/dev/null || echo 'dev')
COMMIT_HASH := $(shell git rev-parse --short HEAD 2>/dev/null || echo 'unknown')
FRONTEND_IMAGE := $(REGISTRY)/$(REPO_NAME)/frontend:$(VERSION)
BACKEND_IMAGE := $(REGISTRY)/$(REPO_NAME)/backend:$(VERSION)
AI_SERVICE_IMAGE := $(REGISTRY)/$(REPO_NAME)/ai-service:$(VERSION)

# Kubernetes settings
KUBE_CONTEXT := $(shell kubectl config current-context 2>/dev/null || echo 'none')
KUBE_NAMESPACE := marineai

# Default target
.PHONY: help
help:
	@echo "$(BOLD)MarineAI Project Makefile$(RESET)"
	@echo "$(BOLD)Usage:$(RESET) make [target]"
	@echo ""
	@echo "$(BOLD)Development Environment:$(RESET)"
	@echo "  $(CYAN)setup$(RESET)              - Initial project setup (install dependencies, create .env)"
	@echo "  $(CYAN)install$(RESET)            - Install all dependencies"
	@echo "  $(CYAN)update$(RESET)             - Update all dependencies"
	@echo "  $(CYAN)env$(RESET)                - Create .env file from example"
	@echo ""
	@echo "$(BOLD)Docker Commands:$(RESET)"
	@echo "  $(CYAN)up$(RESET)                 - Start all services in development mode"
	@echo "  $(CYAN)down$(RESET)               - Stop all services"
	@echo "  $(CYAN)restart$(RESET)            - Restart all services"
	@echo "  $(CYAN)logs$(RESET)               - Show logs from all services"
	@echo "  $(CYAN)ps$(RESET)                 - List running services"
	@echo "  $(CYAN)up-frontend$(RESET)        - Start only frontend service"
	@echo "  $(CYAN)up-backend$(RESET)         - Start only backend service"
	@echo "  $(CYAN)up-ai$(RESET)              - Start only AI service"
	@echo "  $(CYAN)up-db$(RESET)              - Start only database services"
	@echo ""
	@echo "$(BOLD)Database Operations:$(RESET)"
	@echo "  $(CYAN)db-migrate$(RESET)         - Run database migrations"
	@echo "  $(CYAN)db-migrate-create$(RESET)  - Create a new migration"
	@echo "  $(CYAN)db-seed$(RESET)            - Seed database with initial data"
	@echo "  $(CYAN)db-reset$(RESET)           - Reset database (drop and recreate)"
	@echo "  $(CYAN)db-backup$(RESET)          - Backup database"
	@echo "  $(CYAN)db-restore$(RESET)         - Restore database from backup"
	@echo ""
	@echo "$(BOLD)Code Quality:$(RESET)"
	@echo "  $(CYAN)lint$(RESET)               - Run linters on all code"
	@echo "  $(CYAN)format$(RESET)             - Format all code"
	@echo "  $(CYAN)test$(RESET)               - Run all tests"
	@echo "  $(CYAN)test-frontend$(RESET)      - Run frontend tests"
	@echo "  $(CYAN)test-backend$(RESET)       - Run backend tests"
	@echo "  $(CYAN)test-ai$(RESET)            - Run AI service tests"
	@echo "  $(CYAN)coverage$(RESET)           - Generate test coverage reports"
	@echo ""
	@echo "$(BOLD)CI/CD:$(RESET)"
	@echo "  $(CYAN)ci-check$(RESET)           - Run all CI checks locally"
	@echo "  $(CYAN)build$(RESET)              - Build all Docker images"
	@echo "  $(CYAN)push$(RESET)               - Push all Docker images to registry"
	@echo "  $(CYAN)tag$(RESET)                - Tag a new release"
	@echo ""
	@echo "$(BOLD)Deployment:$(RESET)"
	@echo "  $(CYAN)deploy-staging$(RESET)     - Deploy to staging environment"
	@echo "  $(CYAN)deploy-production$(RESET)  - Deploy to production environment"
	@echo "  $(CYAN)k8s-apply$(RESET)          - Apply Kubernetes manifests"
	@echo "  $(CYAN)k8s-delete$(RESET)         - Delete Kubernetes resources"
	@echo ""
	@echo "$(BOLD)Monitoring & Logging:$(RESET)"
	@echo "  $(CYAN)monitor$(RESET)            - Open monitoring dashboard"
	@echo "  $(CYAN)logs-frontend$(RESET)      - Show frontend logs"
	@echo "  $(CYAN)logs-backend$(RESET)       - Show backend logs"
	@echo "  $(CYAN)logs-ai$(RESET)            - Show AI service logs"
	@echo "  $(CYAN)logs-db$(RESET)            - Show database logs"
	@echo ""
	@echo "$(BOLD)Cleanup & Maintenance:$(RESET)"
	@echo "  $(CYAN)clean$(RESET)              - Remove all build artifacts"
	@echo "  $(CYAN)prune$(RESET)              - Prune Docker resources"
	@echo "  $(CYAN)reset$(RESET)              - Full project reset (data will be lost!)"
	@echo ""
	@echo "$(BOLD)Development Workflow:$(RESET)"
	@echo "  $(CYAN)dev$(RESET)                - Start development environment"
	@echo "  $(CYAN)storybook$(RESET)          - Start Storybook for UI components"
	@echo "  $(CYAN)docs$(RESET)               - Generate and serve documentation"
	@echo ""
	@echo "$(BOLD)Current Configuration:$(RESET)"
	@echo "  Version: $(VERSION)"
	@echo "  Commit: $(COMMIT_HASH)"
	@echo "  OS: $(DETECTED_OS)"
	@echo "  Kubernetes Context: $(KUBE_CONTEXT)"
	@echo ""

#--------------------------------------
# Development Environment Setup
#--------------------------------------

.PHONY: setup
setup: env install
	@echo "$(GREEN)✓ Project setup complete$(RESET)"
	@echo "$(YELLOW)Run 'make up' to start all services$(RESET)"

.PHONY: install
install: install-frontend install-backend install-ai
	@echo "$(GREEN)✓ All dependencies installed$(RESET)"

.PHONY: install-frontend
install-frontend:
	@echo "$(BLUE)Installing frontend dependencies...$(RESET)"
	@cd $(FRONTEND_DIR) && npm ci

.PHONY: install-backend
install-backend:
	@echo "$(BLUE)Installing backend dependencies...$(RESET)"
	@cd $(BACKEND_DIR) && npm ci

.PHONY: install-ai
install-ai:
	@echo "$(BLUE)Installing AI service dependencies...$(RESET)"
	@cd $(AI_SERVICE_DIR) && pip install -r requirements.txt

.PHONY: update
update: update-frontend update-backend update-ai
	@echo "$(GREEN)✓ All dependencies updated$(RESET)"

.PHONY: update-frontend
update-frontend:
	@echo "$(BLUE)Updating frontend dependencies...$(RESET)"
	@cd $(FRONTEND_DIR) && npm update

.PHONY: update-backend
update-backend:
	@echo "$(BLUE)Updating backend dependencies...$(RESET)"
	@cd $(BACKEND_DIR) && npm update

.PHONY: update-ai
update-ai:
	@echo "$(BLUE)Updating AI service dependencies...$(RESET)"
	@cd $(AI_SERVICE_DIR) && pip install -U -r requirements.txt

.PHONY: env
env:
	@if [ ! -f $(ENV_FILE) ]; then \
		echo "$(BLUE)Creating .env file from example...$(RESET)"; \
		cp $(ENV_EXAMPLE_FILE) $(ENV_FILE); \
		echo "$(GREEN)✓ Created .env file$(RESET)"; \
		echo "$(YELLOW)Please update the .env file with your settings$(RESET)"; \
	else \
		echo "$(YELLOW)⚠ .env file already exists$(RESET)"; \
	fi

#--------------------------------------
# Docker Commands
#--------------------------------------

.PHONY: up
up:
	@echo "$(BLUE)Starting all services...$(RESET)"
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) up -d
	@echo "$(GREEN)✓ Services started$(RESET)"
	@echo "$(YELLOW)Frontend: http://localhost:3000$(RESET)"
	@echo "$(YELLOW)Backend API: http://localhost:4000/api$(RESET)"
	@echo "$(YELLOW)AI Service: http://localhost:8000$(RESET)"
	@echo "$(YELLOW)MinIO Console: http://localhost:9001$(RESET)"
	@echo "$(YELLOW)Weaviate Console: http://localhost:8080$(RESET)"

.PHONY: down
down:
	@echo "$(BLUE)Stopping all services...$(RESET)"
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) down
	@echo "$(GREEN)✓ Services stopped$(RESET)"

.PHONY: restart
restart: down up
	@echo "$(GREEN)✓ Services restarted$(RESET)"

.PHONY: logs
logs:
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) logs -f

.PHONY: ps
ps:
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) ps

.PHONY: up-frontend
up-frontend:
	@echo "$(BLUE)Starting frontend service...$(RESET)"
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) up -d frontend
	@echo "$(GREEN)✓ Frontend started at http://localhost:3000$(RESET)"

.PHONY: up-backend
up-backend:
	@echo "$(BLUE)Starting backend service...$(RESET)"
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) up -d backend
	@echo "$(GREEN)✓ Backend started at http://localhost:4000/api$(RESET)"

.PHONY: up-ai
up-ai:
	@echo "$(BLUE)Starting AI service...$(RESET)"
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) up -d ai-service
	@echo "$(GREEN)✓ AI service started at http://localhost:8000$(RESET)"

.PHONY: up-db
up-db:
	@echo "$(BLUE)Starting database services...$(RESET)"
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) up -d postgres redis weaviate minio
	@echo "$(GREEN)✓ Database services started$(RESET)"

#--------------------------------------
# Database Operations
#--------------------------------------

.PHONY: db-migrate
db-migrate:
	@echo "$(BLUE)Running database migrations...$(RESET)"
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) exec backend npm run migration:run
	@echo "$(GREEN)✓ Migrations applied$(RESET)"

.PHONY: db-migrate-create
db-migrate-create:
	@echo "$(BLUE)Creating new migration...$(RESET)"
	@read -p "Enter migration name: " name; \
	$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) exec backend npm run migration:generate -- -n $$name
	@echo "$(GREEN)✓ Migration created$(RESET)"

.PHONY: db-seed
db-seed:
	@echo "$(BLUE)Seeding database...$(RESET)"
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) exec backend npm run seed
	@echo "$(GREEN)✓ Database seeded$(RESET)"

.PHONY: db-reset
db-reset:
	@echo "$(RED)⚠ WARNING: This will delete all data in the database!$(RESET)"
	@read -p "Are you sure you want to continue? [y/N] " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		echo "$(BLUE)Resetting database...$(RESET)"; \
		$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) down -v postgres; \
		$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) up -d postgres; \
		sleep 5; \
		$(MAKE) db-migrate; \
		$(MAKE) db-seed; \
		echo "$(GREEN)✓ Database reset complete$(RESET)"; \
	else \
		echo "$(YELLOW)Database reset cancelled$(RESET)"; \
	fi

.PHONY: db-backup
db-backup:
	@echo "$(BLUE)Backing up database...$(RESET)"
	@mkdir -p $(ROOT_DIR)/backups
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) exec -T postgres pg_dump -U marineai marineai_db > $(ROOT_DIR)/backups/marineai_db_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)✓ Database backup created in backups/ directory$(RESET)"

.PHONY: db-restore
db-restore:
	@echo "$(BLUE)Restoring database from backup...$(RESET)"
	@ls -1 $(ROOT_DIR)/backups/*.sql | sort -r
	@read -p "Enter backup file name from the list above: " backup_file; \
	if [ -f "$(ROOT_DIR)/backups/$$backup_file" ]; then \
		$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) exec -T postgres psql -U marineai marineai_db < $(ROOT_DIR)/backups/$$backup_file; \
		echo "$(GREEN)✓ Database restored from $$backup_file$(RESET)"; \
	else \
		echo "$(RED)Error: Backup file not found$(RESET)"; \
	fi

#--------------------------------------
# Code Quality
#--------------------------------------

.PHONY: lint
lint: lint-frontend lint-backend lint-ai
	@echo "$(GREEN)✓ All linting complete$(RESET)"

.PHONY: lint-frontend
lint-frontend:
	@echo "$(BLUE)Linting frontend code...$(RESET)"
	@cd $(FRONTEND_DIR) && npm run lint

.PHONY: lint-backend
lint-backend:
	@echo "$(BLUE)Linting backend code...$(RESET)"
	@cd $(BACKEND_DIR) && npm run lint

.PHONY: lint-ai
lint-ai:
	@echo "$(BLUE)Linting AI service code...$(RESET)"
	@cd $(AI_SERVICE_DIR) && flake8 app tests

.PHONY: format
format: format-frontend format-backend format-ai
	@echo "$(GREEN)✓ All formatting complete$(RESET)"

.PHONY: format-frontend
format-frontend:
	@echo "$(BLUE)Formatting frontend code...$(RESET)"
	@cd $(FRONTEND_DIR) && npm run format

.PHONY: format-backend
format-backend:
	@echo "$(BLUE)Formatting backend code...$(RESET)"
	@cd $(BACKEND_DIR) && npm run format

.PHONY: format-ai
format-ai:
	@echo "$(BLUE)Formatting AI service code...$(RESET)"
	@cd $(AI_SERVICE_DIR) && black app tests

.PHONY: test
test: test-frontend test-backend test-ai
	@echo "$(GREEN)✓ All tests passed$(RESET)"

.PHONY: test-frontend
test-frontend:
	@echo "$(BLUE)Running frontend tests...$(RESET)"
	@cd $(FRONTEND_DIR) && npm test

.PHONY: test-backend
test-backend:
	@echo "$(BLUE)Running backend tests...$(RESET)"
	@cd $(BACKEND_DIR) && npm test

.PHONY: test-ai
test-ai:
	@echo "$(BLUE)Running AI service tests...$(RESET)"
	@cd $(AI_SERVICE_DIR) && pytest

.PHONY: coverage
coverage: coverage-frontend coverage-backend coverage-ai
	@echo "$(GREEN)✓ All coverage reports generated$(RESET)"

.PHONY: coverage-frontend
coverage-frontend:
	@echo "$(BLUE)Generating frontend coverage report...$(RESET)"
	@cd $(FRONTEND_DIR) && npm run test:coverage

.PHONY: coverage-backend
coverage-backend:
	@echo "$(BLUE)Generating backend coverage report...$(RESET)"
	@cd $(BACKEND_DIR) && npm run test:cov

.PHONY: coverage-ai
coverage-ai:
	@echo "$(BLUE)Generating AI service coverage report...$(RESET)"
	@cd $(AI_SERVICE_DIR) && pytest --cov=app --cov-report=html

#--------------------------------------
# CI/CD
#--------------------------------------

.PHONY: ci-check
ci-check: env lint test
	@echo "$(GREEN)✓ CI checks passed$(RESET)"

.PHONY: build
build: build-frontend build-backend build-ai
	@echo "$(GREEN)✓ All Docker images built$(RESET)"

.PHONY: build-frontend
build-frontend:
	@echo "$(BLUE)Building frontend Docker image...$(RESET)"
	@docker build -t $(FRONTEND_IMAGE) -f $(FRONTEND_DIR)/Dockerfile $(FRONTEND_DIR)

.PHONY: build-backend
build-backend:
	@echo "$(BLUE)Building backend Docker image...$(RESET)"
	@docker build -t $(BACKEND_IMAGE) -f $(BACKEND_DIR)/Dockerfile $(BACKEND_DIR)

.PHONY: build-ai
build-ai:
	@echo "$(BLUE)Building AI service Docker image...$(RESET)"
	@docker build -t $(AI_SERVICE_IMAGE) -f $(AI_SERVICE_DIR)/Dockerfile $(AI_SERVICE_DIR)

.PHONY: push
push: push-frontend push-backend push-ai
	@echo "$(GREEN)✓ All Docker images pushed$(RESET)"

.PHONY: push-frontend
push-frontend:
	@echo "$(BLUE)Pushing frontend Docker image...$(RESET)"
	@docker push $(FRONTEND_IMAGE)

.PHONY: push-backend
push-backend:
	@echo "$(BLUE)Pushing backend Docker image...$(RESET)"
	@docker push $(BACKEND_IMAGE)

.PHONY: push-ai
push-ai:
	@echo "$(BLUE)Pushing AI service Docker image...$(RESET)"
	@docker push $(AI_SERVICE_IMAGE)

.PHONY: tag
tag:
	@echo "$(BLUE)Tagging a new release...$(RESET)"
	@read -p "Enter version (e.g., 1.0.0): " version; \
	git tag -a v$$version -m "Release v$$version"; \
	git push origin v$$version; \
	echo "$(GREEN)✓ Tagged v$$version$(RESET)"

#--------------------------------------
# Deployment
#--------------------------------------

.PHONY: deploy-staging
deploy-staging:
	@echo "$(BLUE)Deploying to staging environment...$(RESET)"
	@$(MAKE) build
	@$(MAKE) push
	@$(MAKE) k8s-apply ENV=staging
	@echo "$(GREEN)✓ Deployed to staging$(RESET)"

.PHONY: deploy-production
deploy-production:
	@echo "$(RED)⚠ WARNING: Deploying to PRODUCTION environment!$(RESET)"
	@read -p "Are you sure you want to continue? [y/N] " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		echo "$(BLUE)Deploying to production environment...$(RESET)"; \
		$(MAKE) build; \
		$(MAKE) push; \
		$(MAKE) k8s-apply ENV=production; \
		echo "$(GREEN)✓ Deployed to production$(RESET)"; \
	else \
		echo "$(YELLOW)Production deployment cancelled$(RESET)"; \
	fi

.PHONY: k8s-apply
k8s-apply:
	@echo "$(BLUE)Applying Kubernetes manifests for $(ENV) environment...$(RESET)"
	@kubectl apply -k $(K8S_DIR)/overlays/$(ENV)
	@echo "$(GREEN)✓ Kubernetes manifests applied$(RESET)"

.PHONY: k8s-delete
k8s-delete:
	@echo "$(RED)⚠ WARNING: This will delete Kubernetes resources!$(RESET)"
	@read -p "Enter environment (staging/production): " env; \
	read -p "Are you sure you want to delete resources in $$env? [y/N] " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		echo "$(BLUE)Deleting Kubernetes resources in $$env environment...$(RESET)"; \
		kubectl delete -k $(K8S_DIR)/overlays/$$env; \
		echo "$(GREEN)✓ Kubernetes resources deleted$(RESET)"; \
	else \
		echo "$(YELLOW)Kubernetes deletion cancelled$(RESET)"; \
	fi

#--------------------------------------
# Monitoring & Logging
#--------------------------------------

.PHONY: monitor
monitor:
	@echo "$(BLUE)Opening monitoring dashboard...$(RESET)"
	@open http://localhost:3000/grafana || xdg-open http://localhost:3000/grafana || echo "$(YELLOW)Please open http://localhost:3000/grafana in your browser$(RESET)"

.PHONY: logs-frontend
logs-frontend:
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) logs -f frontend

.PHONY: logs-backend
logs-backend:
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) logs -f backend

.PHONY: logs-ai
logs-ai:
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) logs -f ai-service

.PHONY: logs-db
logs-db:
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) logs -f postgres redis weaviate minio

#--------------------------------------
# Cleanup & Maintenance
#--------------------------------------

.PHONY: clean
clean: clean-frontend clean-backend clean-ai
	@echo "$(GREEN)✓ All build artifacts removed$(RESET)"

.PHONY: clean-frontend
clean-frontend:
	@echo "$(BLUE)Cleaning frontend build artifacts...$(RESET)"
	@cd $(FRONTEND_DIR) && rm -rf dist node_modules/.cache coverage

.PHONY: clean-backend
clean-backend:
	@echo "$(BLUE)Cleaning backend build artifacts...$(RESET)"
	@cd $(BACKEND_DIR) && rm -rf dist node_modules/.cache coverage

.PHONY: clean-ai
clean-ai:
	@echo "$(BLUE)Cleaning AI service build artifacts...$(RESET)"
	@cd $(AI_SERVICE_DIR) && rm -rf __pycache__ .pytest_cache .coverage htmlcov

.PHONY: prune
prune:
	@echo "$(BLUE)Pruning Docker resources...$(RESET)"
	@docker system prune -f
	@echo "$(GREEN)✓ Docker resources pruned$(RESET)"

.PHONY: reset
reset:
	@echo "$(RED)⚠ WARNING: This will reset the entire project and delete all data!$(RESET)"
	@read -p "Are you sure you want to continue? [y/N] " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		echo "$(BLUE)Resetting project...$(RESET)"; \
		$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) down -v; \
		$(MAKE) clean; \
		echo "$(GREEN)✓ Project reset complete$(RESET)"; \
		echo "$(YELLOW)Run 'make setup' to set up the project again$(RESET)"; \
	else \
		echo "$(YELLOW)Project reset cancelled$(RESET)"; \
	fi

#--------------------------------------
# Development Workflow
#--------------------------------------

.PHONY: dev
dev:
	@echo "$(BLUE)Starting development environment...$(RESET)"
	@$(MAKE) up
	@echo "$(GREEN)✓ Development environment started$(RESET)"
	@echo "$(YELLOW)Use 'make logs' to view logs$(RESET)"

.PHONY: storybook
storybook:
	@echo "$(BLUE)Starting Storybook...$(RESET)"
	@cd $(FRONTEND_DIR) && npm run storybook

.PHONY: docs
docs:
	@echo "$(BLUE)Generating and serving documentation...$(RESET)"
	@cd $(DOCS_DIR) && mkdocs serve

#--------------------------------------
# Cross-platform compatibility
#--------------------------------------

# Add Windows-specific commands if needed
ifeq ($(DETECTED_OS),Windows)
# Windows-specific commands
endif

# Add macOS-specific commands if needed
ifeq ($(DETECTED_OS),Darwin)
# macOS-specific commands
endif

# Add Linux-specific commands if needed
ifeq ($(DETECTED_OS),Linux)
# Linux-specific commands
endif
