# FICA Academics - Production Configuration

## 🔐 Security-First Configuration

This project uses environment variables for secure configuration management.

## 📋 Quick Setup

1. **Copy environment template:**

   ```bash
   cp backend/src/env.production.template backend/src/.env.production
   ```

1. **Edit your configuration:**

   ```bash
   nano backend/src/.env.production
   ```

1. **Run production stack:**

   ```bash
   ./test-prod.sh
   ```

## 🔒 Security Features

- ✅ Sensitive data separated from code
- ✅ Environment file in `.gitignore`
- ✅ Template without real values
- ✅ Validation before execution

## 📁 Files

- `backend/src/env.production.template` - Safe template (committed)
- `backend/src/.env.production` - Your config (ignored by git)
- `docker-compose.prod.yml` - Uses env variables
- `test-prod.sh` - Automated testing script

## ⚠️ Important

**NEVER commit `backend/src/.env.production`** - it contains sensitive data!
