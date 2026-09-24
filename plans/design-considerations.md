# Design Consideration

## LLM Skill Identification

### Context

When a task or subtask is created without user-selected skills, the backend must infer the required skills from the task title and persist the resulting task-skill relationships. Explicitly submitted skills always take precedence and bypass LLM inference.

Skills are relational data stored in the database. The initial seed contains `Frontend` and `Backend`, but adding another skill should not require an application deployment.

### Decision: the database is the skill-catalog source of truth

The inference flow loads the current skill records from the database instead of maintaining a second hard-coded allowlist in application code.

```text
POST /v1/tasks
      |
      +-- skill IDs supplied? -- yes --> validate IDs --> persist task
      |
      `-- no
           |
           v
     load ordered skill catalog from database
           |
           v
     inferSkills(title, availableSkillNames)
           |
           v
     validate output against the same catalog
           |
           v
     map names to the already-loaded skill IDs
           |
           v
     persist task and task-skill rows in one transaction
```

The catalog is loaded in a deterministic name order. The same records are used to build the LLM constraints, validate its output, and obtain IDs for persistence. Consequently, an inferred task requires one skill-catalog query rather than one query before inference and another lookup afterward.

This preserves the database invariant that only existing skills can be assigned and keeps the relational model extensible. For example, adding a `DevOps` skill to the database makes it immediately available to inference without changing the provider adapters or deploying new code.

### Module seam and provider adapters

Task creation depends on the following small interface:

```ts
interface SkillInferenceService {
  inferSkills(
    title: string,
    availableSkillNames: readonly string[],
  ): Promise<string[]>;
}
```

The interface is the seam between task orchestration and external LLM providers. Its adapters currently include Groq and Gemini, composed behind a fallback implementation. Task creation does not know which provider produced the result.

The provider adapters own:

- provider-specific SDK calls and error normalization;
- system-prompt construction;
- structured-output schema construction;
- request timeouts and bounded retry with exponential backoff and jitter;
- parsing and validation of provider output.

The task module owns:

- deciding whether inference is required;
- loading the authoritative skill catalog;
- performing a second defensive catalog validation at the application boundary;
- validating assignee compatibility;
- atomically persisting the task and its skill relationships.

Tests replace the provider adapter through the same interface, keeping automated tests deterministic and independent of network access, API keys, rate limits, and model behavior.

### Prompt and structured-output design

The system prompt is generated from the current database skill names. Both Groq and Gemini receive a structured-output schema whose `skills` values are constrained to that same list.

Provider output is still treated as untrusted. Structured output improves model reliability but does not replace application validation. A response is rejected if it is malformed or contains a name outside the catalog supplied for that request. The task module repeats the membership check before persistence as defense in depth.

The task title is sent separately from the system instruction, limiting its ability to alter the classification rules through prompt injection. Database skill names are trusted administrative data; if skill creation later becomes user-accessible, names should be validated and descriptions should be stored separately from prompt control text.

### Consistency and failure behavior

Inference is synchronous because the creation response must contain the inferred skills. This makes task-creation latency dependent on the provider, so requests use a timeout and retry only transient failures such as rate limiting, timeouts, and provider availability errors. A secondary provider can be attempted after the primary provider fails.

Failure behavior is explicit:

- no configured database skills: fail before making an LLM request;
- malformed or unsupported provider output: reject it before persistence;
- all providers unavailable: return a retryable service-unavailable response;
- missing provider configuration: return a configuration/service error;
- explicit user-selected skills: never invoke an LLM, even when providers are unavailable.

There is a small consistency window between reading the skill catalog and committing the task. If a selected skill is deleted concurrently, the database foreign-key constraint prevents invalid persistence. This is acceptable because skill-catalog mutations are expected to be rare; the request fails safely rather than storing a dangling relationship.

## Atomic Task-Tree Creation

Task creation accepts the complete recursive Task tree in one request. The backend prepares every Task and subtask before persistence by validating explicit Skill IDs, inferring omitted Skills, and checking any assignee against the resolved Skills.

LLM calls intentionally finish before the database transaction begins. Remote provider latency and retries must not hold database locks. If any Task cannot be prepared, persistence is never invoked.

After preparation succeeds, the repository inserts the root Task, every descendant, and every Task-Skill relationship inside one transaction. A failure at any depth therefore rolls back the entire tree. The frontend makes one request and never needs to recover from a partially created hierarchy.

Existing single-Task creation remains the degenerate case of the same recursive input with no subtasks.

### Skill-catalog caching decision

The skill catalog is **not cached initially**.

This is deliberate:

- the catalog is small and the query is inexpensive;
- it is queried only when the client submits no skills;
- one query result is reused for prompting, validation, and persistence;
- LLM network latency dominates the database-read latency;
- caching would introduce staleness and invalidation behavior disproportionate to the current benefit.

Caching should be introduced only if production measurements show that catalog reads materially affect database load or task-creation latency.

If caching becomes necessary, introduce a `SkillCatalog` module at the catalog-loading seam rather than embedding caching in the repository or provider adapters. A suitable implementation would use:

- a short, configurable TTL, initially 30–60 seconds;
- single-flight refresh so concurrent cache misses share one database query;
- explicit invalidation after skill create, rename, or delete operations;
- immutable snapshots so an in-flight request uses one internally consistent catalog;
- cache hit, miss, refresh-duration, and refresh-failure metrics;
- a bounded stale-on-error policy only if availability is more important than immediate catalog freshness.

An in-memory cache is sufficient for a single backend instance. With multiple instances, either tolerate TTL-bounded inconsistency or use a shared cache/invalidation mechanism such as Redis. Strong cross-instance cache consistency is unnecessary while the authoritative database and foreign-key constraints remain the final persistence guard.

### Future considerations

- Add an optional skill description field if names alone become insufficient for accurate classification. The prompt can then use descriptions while the structured output continues to return stable skill names or IDs.
- If the catalog grows large enough to make the prompt or enum expensive, shortlist candidates before classification rather than sending the entire catalog.
- Measure provider latency, timeout frequency, fallback frequency, rate-limit responses, invalid-output frequency, and inferred-skill distribution.
- Consider caching normalized title-to-skill classifications separately only after defining invalidation semantics for model changes and skill-catalog changes.
