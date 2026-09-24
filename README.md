# Task Workspace

The Task Workspace is a React frontend and Fastify API backed by PostgreSQL. Users can browse a nested task list, filter tasks, create task trees, assign eligible developers, and update task status. The backend owns validation and business rules; when a task is created without explicit skills, it can infer them from the configured database skill catalog using an LLM provider.

## Run the application

### With Docker Compose

Prerequisites: Docker with the Compose plugin. From the repository root:

1. Create the backend environment file:

   ```bash
   cp backend/.env.example backend/.env
   ```

2. Edit `backend/.env` and set at least one LLM provider key: `LLM_API_KEY` or `GROQ_API_KEY`. Compose supplies the database connection and starts PostgreSQL for you.

Database credentials and exposed ports can also be overridden in `.env`:

```dotenv
POSTGRES_DB=task_assignment
POSTGRES_USER=postgres
POSTGRES_PASSWORD=change-me
FRONTEND_PORT=3000
API_PORT=3001
```

The system prompt lives in `backend/config/skill-inference-system-prompt.txt`. Edit that
file directly, or point Compose at another host file:

```dotenv
SKILL_INFERENCE_PROMPT_HOST_FILE=./config/my-prompt.txt
```

The prompt must contain `{{AVAILABLE_SKILLS}}`; the API replaces that token with the current database skill names. An inline `SKILL_INFERENCE_SYSTEM_PROMPT` environment value takes precedence over the mounted file.

3. Build and start the services:

   ```bash
   docker compose up --build
   ```

   Compose starts PostgreSQL, applies migrations, seeds sample data, and then starts the API and frontend. Open `http://localhost:3000`; the API is available at `http://localhost:3001`.

4. Stop the services with `Ctrl+C`, then run `docker compose down`. Run `docker compose down -v` to remove the data.

### Locally

Prerequisites: Node.js, npm, and PostgreSQL. Create a PostgreSQL database, then use two terminals from the repository root.

1. In terminal one, install and configure the backend:

   ```bash
   cd backend
   npm install
   cp .env.example .env
   ```

   Edit `backend/.env` with your PostgreSQL `DATABASE_URL` and at least one provider key (`LLM_API_KEY` or `GROQ_API_KEY`). Then prepare and start the backend:

   ```bash
   npm run contract:emit
   npm run db:migrate
   npm run db:seed
   npm run dev
   ```

2. In terminal two, install and start the frontend:

   ```bash
   cd frontend
   npm install
   cp .env.example .env.local
   npm run dev
   ```

   Open the local URL printed by Vite (usually `http://localhost:5173`). The frontend uses `http://localhost:3001` for the API by default; set `VITE_API_BASE_URL` in `frontend/.env.local` to change it.

## Frontend

The frontend is a React 19 and TypeScript single-page application built with Vite. It provides the task list and task creation views, calls the backend's `/v1` JSON endpoints, and keeps interactive search, filters, and task-tree presentation in the browser. Frontend validation improves feedback, while the API remains responsible for enforcing assignment and task-state rules.

### Dependencies

- **React and React DOM**: provide the component model and browser rendering for the task workspace.
- **TypeScript**: adds static checks to API contracts, task domain data, and UI code, catching mismatches during development and builds.
- **Vite**: provides the local development server with fast reloads and produces the static production bundle.
- **Mantine Core, Form, and Hooks**: provide accessible UI primitives, form helpers, and reusable interaction hooks, so the interface can stay consistent without maintaining a bespoke component system.
- **Tabler Icons React**: supplies the small set of task and navigation icons as React components.
- **ESLint and the React/TypeScript lint plugins**: catch common code and hook usage errors. They are development tools and are not shipped in the browser bundle.

## Backend

The backend provides the API and owns validation, database access, and LLM based skill inference. See [Run the application](#run-the-application) for Docker Compose and local setup steps.

### Database Development Workflow

When modifying the database model:

```bash
# 1. Edit src/prisma/contract.prisma

# 2. Regenerate the runtime contract
npx prisma contract emit

# 3. Generate a migration
npx prisma migration plan

# 4. Apply the migration
npx prisma db migrate

# 5. Seed data if required
npm run db:seed
```

The Prisma contract artifacts (`contract.json` and `contract.d.ts`) are generated from `contract.prisma` and should not be edited manually.

### Dependencies

- `fastify`: Runs the backend HTTP server and handles API requests
- `@fastify/cors`: Allows the frontend to make cross-origin requests to the API
- `zod`: Validates request data and application configuration
- `typescript`: Checks types and compiles the backend code
- `tsx`: Runs TypeScript files directly during development
- `@types/node`: Provides TypeScript definitions for Node.js APIs
- `eslint`: Finds common code and style issues
- `prettier`: Formats source files consistently

## Notes

- Requirements (plans/requirements.md) — Summarizes the requirements, assumptions, and decisions
- Figma design (plans/figma_design.html) — Shows the planned Task Workspace interface
- Design considerations (plans/design-considerations.md) — Covers key design choices, including LLM skill inference
- System design (plans/system-design.md) — Describes the architecture, data model, APIs, and key technical decisions
