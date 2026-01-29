# Starter Kit Backend

Backend API for the Starter Kit Figma Plugin. Provides centralized data storage so all team members see the same data.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Figma Plugin   │────▶│  This Backend   │────▶│   PostgreSQL    │
│  (any file)     │◀────│  (Heroku)       │◀────│   (Heroku)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Data Storage

### Shared Data (Team-wide)
All users see the same data:
- Templates
- Saved Items
- Figma Links
- Cloud-specific Figma Links
- Custom Clouds
- Editable Clouds
- Cloud Categories
- Status Symbols
- Cloud POCs

### User-Specific Data
Personal to each Figma user:
- Default Cloud preference
- Onboarding state
- Hidden Clouds

## Local Development

1. Install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Set up environment:
   ```bash
   cp .env.example .env
   # Edit .env with your PostgreSQL connection string
   ```

3. Run locally:
   ```bash
   npm run dev
   ```

## Deploy to Heroku

1. Create Heroku app (if not exists):
   ```bash
   heroku create your-app-name
   ```

2. Add PostgreSQL:
   ```bash
   heroku addons:create heroku-postgresql:mini
   ```

3. Deploy:
   ```bash
   # From the backend folder
   git subtree push --prefix backend heroku main
   
   # OR if deploying from root with backend folder:
   heroku config:set NPM_CONFIG_PRODUCTION=false
   git push heroku main
   ```

4. Verify deployment:
   ```bash
   heroku open
   heroku logs --tail
   ```

## API Endpoints

### Shared Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/templates` | Get all templates |
| POST | `/api/templates` | Save templates |
| GET | `/api/saved-items` | Get saved items |
| POST | `/api/saved-items` | Save items |
| GET | `/api/figma-links` | Get Figma links |
| POST | `/api/figma-links` | Save Figma links |
| GET | `/api/cloud-figma-links` | Get cloud-specific links |
| POST | `/api/cloud-figma-links` | Save cloud-specific links |
| GET | `/api/custom-clouds` | Get custom clouds |
| POST | `/api/custom-clouds` | Save custom clouds |
| GET | `/api/editable-clouds` | Get editable clouds config |
| POST | `/api/editable-clouds` | Save editable clouds config |
| GET | `/api/cloud-categories` | Get cloud categories |
| POST | `/api/cloud-categories` | Save cloud categories |
| GET | `/api/status-symbols` | Get status symbols |
| POST | `/api/status-symbols` | Save status symbols |
| GET | `/api/cloud-pocs` | Get cloud POCs |
| POST | `/api/cloud-pocs` | Save cloud POCs |

### User-Specific Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user/:figmaUserId/preferences` | Get all user preferences |
| POST | `/api/user/:figmaUserId/preferences` | Save user preferences |
| GET | `/api/user/:figmaUserId/default-cloud` | Get default cloud |
| POST | `/api/user/:figmaUserId/default-cloud` | Set default cloud |
| GET | `/api/user/:figmaUserId/onboarding` | Get onboarding state |
| POST | `/api/user/:figmaUserId/onboarding` | Save onboarding state |
| GET | `/api/user/:figmaUserId/hidden-clouds` | Get hidden clouds |
| POST | `/api/user/:figmaUserId/hidden-clouds` | Save hidden clouds |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (auto-set by Heroku) |
| `PORT` | Server port (auto-set by Heroku) |
| `NODE_ENV` | Environment (production/development) |
