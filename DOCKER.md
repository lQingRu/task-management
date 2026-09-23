# Docker deployment

The Compose stack runs the React frontend, Fastify API, PostgreSQL, and a
one-shot Prisma migration/seed job. No local Node.js or PostgreSQL installation
is required; only Docker with Compose is needed.

## Configure

Copy `.env.example` to `.env` and set at least one provider key:

```sh
cp .env.example .env
```

Use `LLM_API_KEY` for Gemini, `GROQ_API_KEY` for Groq, or configure both. Groq
is attempted first when both keys are present. Database credentials and exposed
ports can also be overridden in `.env`:

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

The prompt must contain `{{AVAILABLE_SKILLS}}`; the API replaces that token with
the current database skill names. An inline `SKILL_INFERENCE_SYSTEM_PROMPT`
environment value takes precedence over the mounted file.

## Run

From the `root` directory:

```sh
docker compose up --build
```

Open <http://localhost:3000>. The API remains available directly at
<http://localhost:3001>, and health status is at
<http://localhost:3001/health>.

The database is persisted in the `postgres_data` named volume. Migrations and
the idempotent seed run before the API starts. To stop the stack while retaining
data, run `docker compose down`. To intentionally remove database data as well,
run `docker compose down --volumes`.

After changing dependencies, application source, or frontend build-time
configuration, rebuild with `docker compose up --build`. Prompt-file changes
are read at request time and do not require an image rebuild.
