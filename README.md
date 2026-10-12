# Travel App

Monorepo for the Travel App frontend and backend.

## Projects

- `frontend/` - Next.js application
- `backend/` - legacy Spring Boot API, retained during the migration
- `frontend/app/api/` - Node.js API routes deployed with the Next.js application

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

### Recommended: Next.js + Node.js API + Neon

The frontend and Node.js API are deployed together from `frontend/` as one Vercel project.
The Node API preserves the existing routes, including `/api/user`, `/api/trip`,
`/api/notifications`, `/api/customer`, and `/api/ping`.

Set these Vercel environment variables:

- `DATABASE_URL`: Neon PostgreSQL connection string. If you connect Neon through the
  Vercel integration, `POSTGRES_URL` can be used instead.
- `NEXT_PUBLIC_API_BASE_URL`: `/api`

For local Node API development, copy `frontend/.env.example` to `frontend/.env.local`
and provide a real Neon connection string. Start the application with:

```bash
cd frontend
npm install
npm run dev
```

The API health check is available at `http://localhost:3000/api/ping`.

For a fresh Neon database, run
`frontend/database/migrations/001_initial_schema.sql` in the Neon SQL Editor first.
If the existing Spring Boot backend has already used the database, do not run this
migration; its tables are already compatible with the Node API.

### Legacy Spring Boot deployment

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
