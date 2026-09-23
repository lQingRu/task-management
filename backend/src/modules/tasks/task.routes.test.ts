import { describe, expect, it, vi } from "vitest";

import { buildApp } from "../../app.js";
import { TaskCreationError, TaskUpdateError } from "./task.service.js";

const taskId = "11111111-1111-4111-8111-111111111111";
const skillId = "22222222-2222-4222-8222-222222222222";

describe("POST /v1/tasks", () => {
  it("creates a task", async () => {
    const createTask = vi.fn().mockResolvedValue({
      id: taskId,
      title: "Build the API",
      status: "TODO",
      skills: [{ id: skillId, name: "Backend" }],
      assignee: null,
      parentId: null,
      subtasks: [],
    });
    const app = buildApp({ logger: false, services: { createTask } });

    const response = await app.inject({
      method: "POST",
      url: "/v1/tasks",
      payload: {
        title: "  Build the API  ",
        skillIds: [skillId],
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      id: taskId,
      title: "Build the API",
      status: "TODO",
      skills: [{ id: skillId, name: "Backend" }],
      assignee: null,
      parentId: null,
      subtasks: [],
    });
    expect(createTask).toHaveBeenCalledWith({
      title: "Build the API",
      skillIds: [skillId],
    });
  });

  it("rejects an empty title before calling the service", async () => {
    const createTask = vi.fn();
    const app = buildApp({ logger: false, services: { createTask } });

    const response = await app.inject({
      method: "POST",
      url: "/v1/tasks",
      payload: { title: "   " },
    });

    expect(response.statusCode).toBe(400);
    expect(createTask).not.toHaveBeenCalled();
  });

  it("accepts and normalizes a nested Task tree", async () => {
    const childId = "33333333-3333-4333-8333-333333333333";
    const createTask = vi.fn().mockResolvedValue({
      id: taskId,
      title: "Build the API",
      status: "TODO",
      skills: [{ id: skillId, name: "Backend" }],
      assignee: null,
      parentId: null,
      subtasks: [
        {
          id: childId,
          title: "Write tests",
          status: "TODO",
          skills: [{ id: skillId, name: "Backend" }],
          assignee: null,
          parentId: taskId,
          subtasks: [],
        },
      ],
    });
    const app = buildApp({ logger: false, services: { createTask } });

    const response = await app.inject({
      method: "POST",
      url: "/v1/tasks",
      payload: {
        title: "  Build the API  ",
        skillIds: [skillId],
        subtasks: [{ title: "  Write tests  ", skillIds: [skillId] }],
      },
    });

    expect(response.statusCode).toBe(201);
    expect(createTask).toHaveBeenCalledWith({
      title: "Build the API",
      skillIds: [skillId],
      subtasks: [{ title: "Write tests", skillIds: [skillId] }],
    });
  });

  it("returns a domain validation error", async () => {
    const createTask = vi
      .fn()
      .mockRejectedValue(
        new TaskCreationError(
          "ASSIGNEE_MISSING_SKILLS",
          "The selected developer does not possess all required skills",
        ),
      );
    const app = buildApp({ logger: false, services: { createTask } });

    const response = await app.inject({
      method: "POST",
      url: "/v1/tasks",
      payload: { title: "Build the API" },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({
      code: "ASSIGNEE_MISSING_SKILLS",
      message: "The selected developer does not possess all required skills",
    });
  });

  it("returns a service unavailable error when skill inference fails", async () => {
    const createTask = vi
      .fn()
      .mockRejectedValue(
        new TaskCreationError(
          "SKILL_INFERENCE_FAILED",
          "Required skills could not be identified. Please retry later or select skills explicitly.",
          503,
        ),
      );
    const app = buildApp({ logger: false, services: { createTask } });

    const response = await app.inject({
      method: "POST",
      url: "/v1/tasks",
      payload: { title: "Build the API" },
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      code: "SKILL_INFERENCE_FAILED",
      message:
        "Required skills could not be identified. Please retry later or select skills explicitly.",
    });
  });
});

describe("GET /v1/tasks", () => {
  it("returns the task hierarchy", async () => {
    const childId = "33333333-3333-4333-8333-333333333333";
    const getTasks = vi.fn().mockResolvedValue([
      {
        id: taskId,
        title: "Build the API",
        status: "TODO",
        skills: [{ id: skillId, name: "Backend" }],
        assignee: null,
        parentId: null,
        subtasks: [
          {
            id: childId,
            title: "Write tests",
            status: "DONE",
            skills: [],
            assignee: null,
            parentId: taskId,
            subtasks: [],
          },
        ],
      },
    ]);
    const app = buildApp({ logger: false, services: { getTasks } });

    const response = await app.inject({ method: "GET", url: "/v1/tasks" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(await getTasks.mock.results[0]?.value);
    expect(getTasks).toHaveBeenCalledOnce();
  });

  it("returns an empty list when no tasks exist", async () => {
    const app = buildApp({
      logger: false,
      services: { getTasks: async () => [] },
    });

    const response = await app.inject({ method: "GET", url: "/v1/tasks" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });
});

describe("PATCH /v1/tasks/:id", () => {
  it("updates a task", async () => {
    const updateTask = vi.fn().mockResolvedValue({
      id: taskId,
      title: "Updated API task",
      status: "IN_PROGRESS",
      skills: [{ id: skillId, name: "Backend" }],
      assignee: null,
      parentId: null,
      subtasks: [],
    });
    const app = buildApp({ logger: false, services: { updateTask } });

    const response = await app.inject({
      method: "PATCH",
      url: `/v1/tasks/${taskId}`,
      payload: {
        title: "  Updated API task  ",
        status: "IN_PROGRESS",
        assigneeId: null,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      id: taskId,
      title: "Updated API task",
      status: "IN_PROGRESS",
      skills: [{ id: skillId, name: "Backend" }],
      assignee: null,
      parentId: null,
      subtasks: [],
    });
    expect(updateTask).toHaveBeenCalledWith(taskId, {
      title: "Updated API task",
      status: "IN_PROGRESS",
      assigneeId: null,
    });
  });

  it("rejects an empty update", async () => {
    const updateTask = vi.fn();
    const app = buildApp({ logger: false, services: { updateTask } });

    const response = await app.inject({
      method: "PATCH",
      url: `/v1/tasks/${taskId}`,
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    expect(updateTask).not.toHaveBeenCalled();
  });

  it("returns 404 when the task does not exist", async () => {
    const updateTask = vi
      .fn()
      .mockRejectedValue(
        new TaskUpdateError("TASK_NOT_FOUND", 404, `Task not found: ${taskId}`),
      );
    const app = buildApp({ logger: false, services: { updateTask } });

    const response = await app.inject({
      method: "PATCH",
      url: `/v1/tasks/${taskId}`,
      payload: { status: "DONE" },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      code: "TASK_NOT_FOUND",
      message: `Task not found: ${taskId}`,
    });
  });
});
