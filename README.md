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
```

## Repository Layout

Both applications are tracked in this single GitHub repository. Build outputs such as `frontend/.next`, `frontend/node_modules`, and `backend/target` are intentionally ignored.
