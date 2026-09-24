# Requirements

## 1. Task

### 1.1 Task Creation

#### Must-Have

A user must be able to create a Task.

A Task minimally contains:

- `id`
- `title`
- `status`
- `skills`
- `assignee`
- `subtasks`

During creation:

- Task title must be provided.
- Required skill(s) may be explicitly specified.
- A Developer does not need to be assigned during creation.
- If no Skill is specified, the backend must automatically identify the required Skill(s) using an LLM.

#### Assumptions

- A newly created Task has status `To-do` by default.
- A Task may initially be unassigned.
- Supported statuses are initially:
  - `To-do`
  - `In Progress`
  - `Done`

#### Design Decisions

- Store `createdAt` and `updatedAt` timestamps.
- Generate Task IDs automatically.
- Model status using a centrally defined enum/domain type rather than free-form strings.
- Required Skills are represented as relationships to Skill entities instead of embedding strings directly into the Task.

#### Good-to-Have

- Support editing the Task title after creation.

#### Future Extension / Out of Scope

- Separate `description` from `title` if richer task content is required.
- Add due dates, priority, labels, comments, attachments, etc.

These are intentionally not implemented unless there is spare time because they are not part of the stated requirements.

---

## 1.2 Task Retrieval

### Must-Have

A Task and its relevant properties must be retrievable.

Relevant properties include:

- title
- status
- skills
- assignee
- subtasks

The system must also support retrieving Tasks for display on the Task List page.

### Design Decisions

- Task-list responses may return a summary representation.
- A single-Task endpoint may return the complete nested Task hierarchy.

This avoids unnecessarily returning deeply nested data for every list request.

---

## 1.3 Task Update

### Must-Have

The system must support:

- changing Task status
- assigning/changing the Developer assigned to a Task

A Task can only be assigned to a Developer who possesses all Skills required by the Task.

This rule must be enforced by the backend.

### Design Decisions

Frontend validation may prevent invalid choices for better UX, but backend validation remains the source of truth.

### Good-to-Have

- Edit title.
- Edit required skills.

These are useful CRUD capabilities but are not explicitly required by the assessment.

---

## 1.4 Task Deletion

### Out of Scope

Task deletion is not explicitly required.

Therefore, deletion will not initially be implemented.

### Future Extension

If deletion is later supported:

- deletion semantics must define what happens to subtasks
- soft-delete versus hard-delete should be considered
- referential integrity with assignments and Skills should be preserved

---

# 2. Developer

## 2.1 Developer Retrieval

### Must-Have

A Developer and their relevant properties must be retrievable.

Relevant properties include:

- `id`
- `name`
- Skills

### Seed Data

The following Developers must be seeded:

| Developer | Skills            |
| --------- | ----------------- |
| Alice     | Frontend          |
| Bob       | Backend           |
| Carol     | Frontend, Backend |
| Dave      | Backend           |

This seed data is explicitly required.

---

## 2.2 Developer Skills

### Must-Have

- A Developer may possess one or more Skills.
- The same Skill may belong to multiple Developers.

### Design Decision

Model Developer ↔ Skill as a many-to-many relationship.

For example:

```text
Developer
    |
    v
DeveloperSkill
    |
    v
Skill
```

This allows additional Skills to be introduced without changing the Developer schema.

---

# 3. Skill

## 3.1 Skill Retrieval

### Must-Have

A Skill and its relevant properties must be retrievable.

Initial Skills include:

- Frontend
- Backend

### Design Decisions

Skills should be database entities rather than hard-coded Boolean fields such as:

```text
isFrontend
isBackend
```

A relational model allows new Skills to be added without schema changes.

### Future Extension

Additional Skills such as:

- DevOps
- Data Engineering
- AI/ML

could be introduced later.

These should **not** be necessary for the current assessment implementation.

---

# 4. Task Assignment

## 4.1 Single Developer Assignment

### Must-Have

A Task may:

- have no assignee, or
- be assigned to **one** Developer

The assessment refers to assigning a Task to **a Developer**, and assignment is valid only when that Developer possesses all required Skills.

### Design Decision

The initial schema therefore uses:

```text
Task.assigneeId -> Developer.id
```

where `assigneeId` is nullable.

### Future Extension

If multiple Developers per Task become a requirement, this can be generalized to:

```text
Task
  |
  v
TaskAssignment
  |
  v
Developer
```

This is deliberately **not implemented now** because multiple-assignee semantics are undefined.

For example, a future requirement would need to clarify whether:

- every assigned Developer must individually satisfy all required Skills, or
- Developers may collectively satisfy the Skill requirements.

---

## 4.2 Assignment Validation

### Must-Have

A Developer must possess **all** Skills required by the Task.

Example:

```text
Task requires:
Frontend + Backend
```

Valid:

```text
Carol
Frontend + Backend
```

Invalid:

```text
Alice
Frontend only
```

### Design Decision

Validation must occur in the backend service/domain layer rather than only in the frontend.

### Good-to-Have

The frontend assignee dropdown only shows Developers who satisfy the Task's Skill requirements.

---

# 5. Subtasks

## 5.1 Task Hierarchy

### Must-Have

- A Task may contain multiple subtasks.
- A subtask has the same properties as a Task.
- A subtask may itself contain nested subtasks.

### Design Decision

Tasks and subtasks use the same entity.

```text
Task
----
id
title
status
assigneeId
parentTaskId
```

where:

```text
parentTaskId -> Task.id
```

A root Task has:

```text
parentTaskId = null
```

A subtask references its parent Task.

### Design Extensibility

The backend model should naturally support arbitrary nesting rather than introducing:

```text
Task
Subtask
SubSubtask
```

as separate entities.

### Out of Scope

No arbitrary limit for the depth of task levels unless required for technical protection.

If a nesting limit is introduced later for usability/performance reasons, it should be treated as an explicit business or operational constraint.

---

## 5.2 Subtask Properties

### Assumption

Each Task independently owns:

- title
- status
- Skills
- assignee
- subtasks

A child Task does not need to inherit its parent's Skills.

Therefore this is valid:

```text
Parent Task
Skill: Frontend

└── Subtask
    Skill: Backend
```

---

## 5.3 Completion Rules

### Must-Have

A Task may only transition to `Done` if all of its subtasks are already `Done`.

Example:

```text
Parent
├── Child A: Done
└── Child B: Done

Parent -> Done ✓
```

Invalid:

```text
Parent
├── Child A: Done
└── Child B: In Progress

Parent -> Done ✗
```

### Design Decision

The rule is applied consistently to every Task, including nested Tasks.

Therefore:

```text
Parent
└── Child: Done
    └── Grandchild: Done
```

is structurally valid because Child could only become `Done` once Grandchild was `Done`.

### Assumption

An ambiguous scenario exists when:

```text
Parent: Done
└── Child: Done
```

later becomes:

```text
Parent: Done
└── Child: In Progress
```

The specification does not define this case.

A reasonable implementation is:

> Reopening a child automatically reopens any completed ancestor Tasks.

For example:

```text
Parent: Done
└── Child: Done

Child -> In Progress

becomes:

Parent: In Progress
└── Child: In Progress
```

---

# 6. Task List

## 6.1 Display Tasks

### Must-Have

The application must provide a Task List page displaying all existing Tasks and their relevant attributes.

At minimum display:

- title
- required Skills
- status
- assignee

Users must be able to:

- change Task status
- assign a valid Developer

### Design Decisions

The Task List should primarily display root Tasks.

Nested Tasks may be:

- expanded inline, or
- displayed through a nested component

depending on UI simplicity.

---

## 6.2 Assignment UX

### Must-Have

Assignment must respect the required-Skill rule.

### Good-to-Have

Only eligible Developers are displayed in the assignee selector.

For example:

```text
Task skills:
Frontend + Backend

Dropdown:
Carol
```

rather than showing Alice/Bob/Dave and returning an error only after selection.

Backend validation must still exist.

---

## 6.3 Search and Filtering

### Good-to-Have

If time allows:

- search by Task title
- filter by status
- filter by Skill
- filter by assignee

### Out of Scope

Do not introduce Elasticsearch or any dedicated search infrastructure.

A PostgreSQL query is sufficient for this scope.

---

# 7. Task Creation UI

## 7.1 Creation Form

### Must-Have

The Task Creation page must support:

- entering a Task title
- selecting required Skills
- creating Tasks without an assignee
- adding subtasks
- adding nested subtasks
- submitting the complete Task hierarchy

### Design Decision

Use a recursive React component such as:

```text
TaskForm
  ├── title
  ├── skills
  └── subtasks
        |
        v
      TaskForm
        ├── title
        ├── skills
        └── subtasks
```

This mirrors the recursive Task domain model.

---

# 8. LLM Skill Identification

## 8.1 Automatic Skill Identification

### Must-Have

When a newly created Task or subtask has **no user-specified Skills**, the backend must use an LLM to identify the required Skills from the Task title.

Example:

```text
"Build a responsive homepage"
    ->
Frontend
```

The user must not need to manually trigger LLM inference.

### Must-Have Behaviour

```text
Skills explicitly supplied?
       |
   +---+---+
   |       |
  Yes      No
   |       |
Use them   Call LLM
           |
           v
     Validate output
           |
           v
       Save skills
```

The LLM must not overwrite explicitly selected Skills.

---

## 8.2 LLM Output Validation

### Design Decision

The LLM should classify Tasks into existing supported Skills rather than dynamically create arbitrary Skills.

For the initial implementation:

```text
Allowed Skills:
- Frontend
- Backend
```

LLM output must be validated before persistence.

For example:

```json
{
  "skills": ["Frontend", "Backend"]
}
```

rather than accepting arbitrary natural-language output.

---

## 8.3 LLM Integration Architecture

### Design Decision

LLM integration should be behind an abstraction such as:

```ts
interface SkillInferenceService {
  inferSkills(title: string): Promise<Skill[]>;
}
```

Possible implementations:

```text
SkillInferenceService
       |
       +-- GeminiSkillInferenceService
       |
       +-- FakeSkillInferenceService
```

This enables deterministic automated testing without calling a real LLM.

### Good-to-Have

- request timeout
- retry policy for transient failures
- structured output
- logging of inference failures
- meaningful error handling

### Out of Scope

- manual regeneration
- conversational UI
- prompt history
- model selection UI
- arbitrary Skill generation
- background LLM processing

The requirement currently implies synchronous inference as part of Task creation.

---

# 9. Database

## 9.1 Database Technology

### Must-Have

PostgreSQL must be used.

### Must-Have Domain Relationships

The database must support:

```text
Developer >---< Skill

Task >---< Skill

Developer 1 --- * Task

Task 1 --- * Task
(parent)      (children)
```

Conceptually:

```text
Developer
    |
    +----< DeveloperSkill >---- Skill
    |
    +----< Task
             |
             +----< TaskSkill >---- Skill
             |
             +----< Task (subtasks)
```

### Design Decisions

- use migrations
- provide seed scripts
- preserve referential integrity using foreign keys
- indexes on foreign-key columns where useful

---

# 10. Backend API

## 10.1 Technology

### Must-Have

Backend must use:

- TypeScript
- Node.js or a framework built on Node.js

### Design Decision

Use:

```text
TypeScript + Fastify
```

---

## 10.2 Required Capabilities

### Must-Have

Tasks:

```text
Create Task
Read Task
Change Task status
Assign Developer
```

Developers:

```text
Read Developer
```

Skills:

```text
Read Skill
```

These are the explicit backend operations requested.

### Possible API

```text
POST   /api/tasks # create task
GET    /api/tasks # get list of tasks
GET    /api/tasks/:id # get details of a particular task (incl. sub-tasks)

PATCH  /api/tasks/:id/status # update status
PATCH  /api/tasks/:id/assignee # update assignee

GET    /api/developers # get list of developers
GET    /api/developers/:id # get details of a developer (incl. name, skills)

GET    /api/skills # get list of skills
GET    /api/skills/:id # get info of a skill (incl. name)
```

This is an implementation decision rather than an explicit requirement.

---

# 11. Validation and Error Handling

## Must-Have Engineering Behaviour

Backend should validate:

- required fields
- valid Task status
- existing Developer IDs
- existing Skill IDs
- Developer Skill compatibility
- Task completion constraints
- valid LLM output

### Design Decision

Use consistent HTTP error responses.

For example:

```json
{
  "code": "INVALID_ASSIGNEE",
  "message": "Developer does not possess all skills required by the task."
}
```

### Good-to-Have

Differentiate appropriately between:

```text
400 Bad Request
404 Not Found
409 Conflict
500 Internal Server Error
```

---

# 12. Authentication and Authorization

## Out of Scope

The specification does not define:

- authenticated users
- Projects
- roles
- permissions
- ownership
- access-control rules

Therefore project-level RBAC/ABAC should not be implemented.

### Future Extension

In a production system:

```text
User
 |
 v
ProjectMembership
 |
 v
Project
 |
 v
Tasks
```

could support authorization.

Mutation endpoints could then enforce project-scoped RBAC/ABAC.

This should be documented as a production consideration rather than implemented for this assessment.

---

# 13. Non-Functional / Engineering Requirements

## Must-Have

The solution must use:

- Git
- TypeScript/React for the frontend
- TypeScript/Node.js for the backend
- PostgreSQL
- Docker
- Docker Compose

The README must document:

- configuration
- how to run the application
- system design
- API
- library/dependency choices and justification

---

## Engineering Quality

### Strongly Recommended

- automated backend tests
- frontend component tests for important behaviour
- database migrations
- seed script
- request validation
- `.env.example`
- no committed credentials
- ESLint
- Prettier
- meaningful Git commit history

### Good-to-Have

- structured logging
- `/health` endpoint
- graceful shutdown
- basic API documentation/OpenAPI
- simple CI workflow

---

# 14. Explicit Scope Priorities

### P0 — Must Complete

#### Setup

- Database schema + seed

#### Task

- Task creation
- Task read/list
- Task status update
- Nested subtasks
- Done/subtask invariant
- Recursive Task creation UI
- React Task List

#### Task Developer

- Single Developer assignment
- Developer Skill validation

#### LLM

- LLM Skill inference

#### Deployment

- Docker Compose

#### Tests

- Core automated tests

#### Docs

- README

### P1 — Good Engineering Enhancements

#### Task

- `createdAt` / `updatedAt` fields
- Eligible-Developer filtering

#### LLM

- LLM timeout/error handling
- Structured validation/errors

#### Docs

- OpenAPI

#### Tests

Basic frontend tests

### P2 — Only If Time Allows

#### List

- Task search
- Task filtering

#### Task

- Edit title
- Edit Skills

#### UI

- Additional UI polish

### Explicitly Not Implementing

#### Task

- Task delete
- Multiple assignees
- Project model

#### Access control

- Authentication
- RBAC / ABAC

#### Architecture

- Workflow engine
- Background jobs

#### Management

- Arbitrary Skill creation

#### Extras

- Notifications
