import { z } from "zod";

import { skillSchema } from "../skills/skill.schema.js";

export const createTaskBodySchema = z.object({
  title: z.string().trim().min(1),
  skillIds: z.array(z.uuid()).optional(),
  assigneeId: z.uuid().nullable().optional(),
  parentId: z.uuid().nullable().optional(),
});

export const taskParamsSchema = z.object({
  id: z.uuid(),
});

export const updateTaskBodySchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
    assigneeId: z.uuid().nullable().optional(),
  })
  .refine(
    (value) =>
      value.title !== undefined ||
      value.status !== undefined ||
      value.assigneeId !== undefined,
    { message: "At least one field must be provided" },
  );

export const taskAssigneeSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
});

export interface TaskResponse {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  skills: Array<z.infer<typeof skillSchema>>;
  assignee: z.infer<typeof taskAssigneeSchema> | null;
  parentId: string | null;
  subtasks: TaskResponse[];
}

export const taskResponseSchema: z.ZodType<TaskResponse> = z.lazy(() =>
  z.object({
    id: z.uuid(),
    title: z.string().min(1),
    status: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
    skills: z.array(skillSchema),
    assignee: taskAssigneeSchema.nullable(),
    parentId: z.uuid().nullable(),
    subtasks: z.array(taskResponseSchema),
  }),
);

export const createdTaskResponseSchema = taskResponseSchema;
export const tasksResponseSchema = z.array(taskResponseSchema);

export const taskErrorResponseSchema = z.object({
  code: z.string(),
  message: z.string(),
});

export type CreateTaskInput = z.infer<typeof createTaskBodySchema>;
export type CreatedTaskResponse = TaskResponse;
export type UpdateTaskInput = z.infer<typeof updateTaskBodySchema>;
