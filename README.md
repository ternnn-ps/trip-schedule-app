# Travel App

Monorepo for the Travel App frontend and backend.

## Projects

- `frontend/` - Next.js application
- `backend/` - Spring Boot API

## Frontend

```bash
cd frontend
npm install
npm run dev
```

## Backend

```bash
cd backend
./mvnw spring-boot:run
```

For Neon/PostgreSQL, set these environment variables before running the backend:

```bash
export NEON_DATABASE_URL="jdbc:postgresql://..."
export NEON_DATABASE_USERNAME="..."
export NEON_DATABASE_PASSWORD="..."
export APP_CORS_ALLOWED_ORIGINS="http://localhost:3000"
```

## Deployment

Recommended free setup:

- Vercel for `frontend/`
- Render for `backend/`
- Neon for PostgreSQL

### Vercel

- Root Directory: `frontend`
- Build Command: `npm run build`
- Install Command: `npm install`
- Environment Variables:
  - `NEXT_PUBLIC_API_BASE_URL`: your Render backend URL, for example `https://travel-app-api.onrender.com`

### Render

- Service Type: Web Service
- Root Directory: `backend`
- Runtime: Docker
- Dockerfile Path: `backend/Dockerfile`
- Environment Variables:
  - `SPRING_PROFILES_ACTIVE`: `neon`
  - `NEON_DATABASE_URL`: your Neon JDBC URL
  - `NEON_DATABASE_USERNAME`: your Neon database username
  - `NEON_DATABASE_PASSWORD`: your Neon database password
  - `APP_CORS_ALLOWED_ORIGINS`: your Vercel frontend URL, for example `https://travel-app.vercel.app`

## Repository Layout

Both applications are tracked in this single GitHub repository. Build outputs such as `frontend/.next`, `frontend/node_modules`, and `backend/target` are intentionally ignored.
