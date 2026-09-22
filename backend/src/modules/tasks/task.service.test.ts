import { describe, expect, it, vi } from "vitest";

import type { TaskRepository } from "./task.repository.js";
import { createTask, getTasks, updateTask } from "./task.service.js";

const taskId = "11111111-1111-4111-8111-111111111111";
const backendSkillId = "22222222-2222-4222-8222-222222222222";
const frontendSkillId = "33333333-3333-4333-8333-333333333333";
const developerId = "44444444-4444-4444-8444-444444444444";
const parentId = "55555555-5555-4555-8555-555555555555";

function createRepository(
  overrides: Partial<TaskRepository> = {},
): TaskRepository {
  return {
    findSkillsByIds: vi.fn().mockResolvedValue([]),
    findDeveloperById: vi.fn().mockResolvedValue(null),
    taskExists: vi.fn().mockResolvedValue(true),
    create: vi.fn().mockResolvedValue({
      id: taskId,
      title: "Build the API",
      status: "TODO",
      parentId: null,
    }),
    findAll: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("createTask", () => {
  it("creates an unassigned task without skills when skillIds is omitted", async () => {
    const repository = createRepository();

    const task = await createTask({ title: "Build the API" }, repository);

    expect(task).toEqual({
      id: taskId,
      title: "Build the API",
      status: "TODO",
      skills: [],
      assignee: null,
      parentId: null,
      subtasks: [],
    });
    expect(repository.findSkillsByIds).toHaveBeenCalledWith([]);
    expect(repository.create).toHaveBeenCalledWith({
      title: "Build the API",
      skillIds: [],
      assigneeId: null,
      parentId: null,
    });
  });

  it("creates a task when the assignee has every required skill", async () => {
    const repository = createRepository({
      findSkillsByIds: vi.fn().mockResolvedValue([
        { id: backendSkillId, name: "Backend" },
        { id: frontendSkillId, name: "Frontend" },
      ]),
      findDeveloperById: vi.fn().mockResolvedValue({
        id: developerId,
        name: "Carol",
        skills: [{ skillId: backendSkillId }, { skillId: frontendSkillId }],
      }),
      create: vi.fn().mockResolvedValue({
        id: taskId,
        title: "Build the API",
        status: "TODO",
        parentId,
      }),
    });

    const task = await createTask(
      {
        title: "Build the API",
        skillIds: [backendSkillId, frontendSkillId, backendSkillId],
        assigneeId: developerId,
        parentId,
      },
      repository,
    );

    expect(task.assignee).toEqual({ id: developerId, name: "Carol" });
    expect(task.parentId).toBe(parentId);
    expect(repository.findSkillsByIds).toHaveBeenCalledWith([
      backendSkillId,
      frontendSkillId,
    ]);
    expect(repository.create).toHaveBeenCalledWith({
      title: "Build the API",
      skillIds: [backendSkillId, frontendSkillId],
      assigneeId: developerId,
      parentId,
    });
  });

  it("rejects unknown skill IDs", async () => {
    const repository = createRepository();

    await expect(
      createTask(
        { title: "Build the API", skillIds: [backendSkillId] },
        repository,
      ),
    ).rejects.toMatchObject({
      code: "SKILLS_NOT_FOUND",
      statusCode: 422,
    });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("rejects an assignee who lacks a required skill", async () => {
    const repository = createRepository({
      findSkillsByIds: vi
        .fn()
        .mockResolvedValue([{ id: backendSkillId, name: "Backend" }]),
      findDeveloperById: vi.fn().mockResolvedValue({
        id: developerId,
        name: "Alice",
        skills: [{ skillId: frontendSkillId }],
      }),
    });

    await expect(
      createTask(
        {
          title: "Build the API",
          skillIds: [backendSkillId],
          assigneeId: developerId,
        },
        repository,
      ),
    ).rejects.toMatchObject({
      code: "ASSIGNEE_MISSING_SKILLS",
      statusCode: 422,
    });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("rejects an unknown parent task", async () => {
    const repository = createRepository({
      taskExists: vi.fn().mockResolvedValue(false),
    });

    await expect(
      createTask({ title: "Nested task", parentId }, repository),
    ).rejects.toMatchObject({
      code: "PARENT_NOT_FOUND",
      statusCode: 422,
    });
    expect(repository.create).not.toHaveBeenCalled();
  });
});

describe("getTasks", () => {
  it("returns root tasks with nested subtasks", async () => {
    const childId = "66666666-6666-4666-8666-666666666666";
    const repository = createRepository({
      findAll: vi.fn().mockResolvedValue([
        {
          id: taskId,
          title: "Build the API",
          status: "TODO",
          parentId: null,
          assignee: {
            id: developerId,
            name: "Carol",
          },
          skills: [
            {
              skill: {
                id: frontendSkillId,
                name: "Frontend",
              },
            },
            {
              skill: {
                id: backendSkillId,
                name: "Backend",
              },
            },
          ],
        },
        {
          id: childId,
          title: "Write tests",
          status: "DONE",
          parentId: taskId,
          assignee: null,
          skills: [],
        },
      ]),
    });

    const tasks = await getTasks(repository);

    expect(tasks).toEqual([
      {
        id: taskId,
        title: "Build the API",
        status: "TODO",
        parentId: null,
        assignee: { id: developerId, name: "Carol" },
        skills: [
          { id: backendSkillId, name: "Backend" },
          { id: frontendSkillId, name: "Frontend" },
        ],
        subtasks: [
          {
            id: childId,
            title: "Write tests",
            status: "DONE",
            parentId: taskId,
            assignee: null,
            skills: [],
            subtasks: [],
          },
        ],
      },
    ]);
  });

  it("returns an empty list when no tasks exist", async () => {
    const tasks = await getTasks(createRepository());

    expect(tasks).toEqual([]);
  });
});

describe("updateTask", () => {
  const currentTask = {
    id: taskId,
    title: "Build the API",
    status: "TODO" as const,
    parentId: null,
    assignee: null,
    skills: [{ skill: { id: backendSkillId, name: "Backend" } }],
    subtasks: [],
  };

  it("updates a task status when all subtasks are done", async () => {
    const repository = createRepository({
      findById: vi.fn().mockResolvedValue({
        ...currentTask,
        subtasks: [{ id: parentId, status: "DONE" }],
      }),
      findAll: vi.fn().mockResolvedValue([
        {
          ...currentTask,
          status: "DONE",
        },
      ]),
    });

    const task = await updateTask(taskId, { status: "DONE" }, repository);

    expect(task.status).toBe("DONE");
    expect(repository.update).toHaveBeenCalledWith(
      taskId,
      { status: "DONE" },
      false,
    );
  });

  it("rejects completion while a subtask is unfinished", async () => {
    const repository = createRepository({
      findById: vi.fn().mockResolvedValue({
        ...currentTask,
        subtasks: [{ id: parentId, status: "IN_PROGRESS" }],
      }),
    });

    await expect(
      updateTask(taskId, { status: "DONE" }, repository),
    ).rejects.toMatchObject({
      code: "SUBTASKS_NOT_DONE",
      statusCode: 422,
    });
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("rejects an assignee who lacks a required skill", async () => {
    const repository = createRepository({
      findById: vi.fn().mockResolvedValue(currentTask),
      findDeveloperById: vi.fn().mockResolvedValue({
        id: developerId,
        name: "Alice",
        skills: [{ skillId: frontendSkillId }],
      }),
    });

    await expect(
      updateTask(taskId, { assigneeId: developerId }, repository),
    ).rejects.toMatchObject({
      code: "ASSIGNEE_MISSING_SKILLS",
      statusCode: 422,
    });
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("reopens completed ancestors when a completed child is reopened", async () => {
    const childId = "66666666-6666-4666-8666-666666666666";
    const completedChild = {
      ...currentTask,
      id: childId,
      status: "DONE" as const,
      parentId: taskId,
    };
    const repository = createRepository({
      findById: vi.fn().mockResolvedValue(completedChild),
      findAll: vi.fn().mockResolvedValue([
        {
          ...currentTask,
          status: "IN_PROGRESS",
          skills: [],
        },
        {
          ...completedChild,
          status: "IN_PROGRESS",
        },
      ]),
    });

    const task = await updateTask(
      childId,
      { status: "IN_PROGRESS" },
      repository,
    );

    expect(task.status).toBe("IN_PROGRESS");
    expect(repository.update).toHaveBeenCalledWith(
      childId,
      { status: "IN_PROGRESS" },
      true,
    );
  });
});
