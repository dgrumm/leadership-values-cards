# Leadership Values Cards - Build Commands
# Handles CSV deck loading and validation

.PHONY: help build-csv deck-dev deck-professional deck-extended validate-csv clean-generated dev test-e2e simulate

# Default target
help:
	@echo "🎴 Leadership Values Cards - Available Commands"
	@echo ""
	@echo "CSV & Deck Management:"
	@echo "  make build-csv          Validate and build all CSV decks"
	@echo "  make deck-dev           Build development deck (16 cards)"
	@echo "  make deck-professional  Build professional deck (40 cards)"
	@echo "  make deck-extended      Build extended deck (72 cards)"
	@echo "  make validate-csv       Validate all CSV files without building"
	@echo ""
	@echo "Development:"
	@echo "  make dev               Start Next.js development server"
	@echo "  make build             Build production application"
	@echo "  make test-e2e          Run Playwright end-to-end tests"
	@echo "  make simulate          Start multi-user test environment"
	@echo ""
	@echo "Utilities:"
	@echo "  make clean-generated   Remove generated files"
	@echo "  make help              Show this help message"

# CSV and Deck Commands
build-csv:
	@echo "🎴 Building all card decks..."
	@node scripts/build-csv.js validate

deck-dev:
	@echo "🎴 Building development deck (16 cards)..."
	@node scripts/build-csv.js dev

deck-professional:
	@echo "🎴 Building professional deck (40 cards)..."
	@node scripts/build-csv.js professional

deck-extended:
	@echo "🎴 Building extended deck (72 cards)..."
	@node scripts/build-csv.js extended

validate-csv:
	@echo "🔍 Validating CSV files..."
	@node scripts/build-csv.js validate --dry-run

# Development Commands
dev: build-csv
	@echo "🚀 Starting development server..."
	@npm run dev

build: build-csv
	@echo "🏗️  Building production application..."
	@npm run build

test-e2e:
	@echo "🧪 Running end-to-end tests..."
	@npm run test:e2e

simulate:
	@echo "👥 Starting multi-user simulation..."
	@node scripts/simulate-users.js

# Utility Commands
clean-generated:
	@echo "🧹 Cleaning generated files..."
	@rm -rf lib/generated/
	@echo "✅ Generated files removed"

# Environment-based deck selection
deck:
	@if [ "$$CARD_DECK_TYPE" = "dev" ]; then \
		$(MAKE) deck-dev; \
	elif [ "$$CARD_DECK_TYPE" = "extended" ]; then \
		$(MAKE) deck-extended; \
	else \
		$(MAKE) deck-professional; \
	fi

# Pre-build hook for Next.js
pre-build: build-csv
	@echo "✅ Pre-build CSV processing complete"

# Validation targets for CI/CD
validate: validate-csv
	@echo "✅ All validation checks passed"

# Quick deck switching with confirmation
switch-deck:
	@echo "Current deck type: $${CARD_DECK_TYPE:-professional}"
	@echo "Available decks: dev, professional, extended"
	@read -p "Enter deck type: " deck; \
	if [ "$$deck" = "dev" ] || [ "$$deck" = "professional" ] || [ "$$deck" = "extended" ]; then \
		export CARD_DECK_TYPE=$$deck; \
		$(MAKE) deck-$$deck; \
		echo "✅ Switched to $$deck deck"; \
	else \
		echo "❌ Invalid deck type: $$deck"; \
		exit 1; \
	fi