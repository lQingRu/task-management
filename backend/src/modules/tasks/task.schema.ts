import { z } from "zod";

import { skillSchema } from "../skills/skill.schema.js";

export const createTaskBodySchema = z.object({
  title: z.string().trim().min(1),
  skillIds: z.array(z.uuid()).optional(),
  assigneeId: z.uuid().nullable().optional(),
  parentId: z.uuid().nullable().optional(),
});

const taskAssigneeSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
});

export const createdTaskResponseSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
  skills: z.array(skillSchema),
  assignee: taskAssigneeSchema.nullable(),
  parentId: z.uuid().nullable(),
  subtasks: z.tuple([]),
});

export const taskErrorResponseSchema = z.object({
  code: z.string(),
  message: z.string(),
});

export type CreateTaskInput = z.infer<typeof createTaskBodySchema>;
export type CreatedTaskResponse = z.infer<typeof createdTaskResponseSchema>;
