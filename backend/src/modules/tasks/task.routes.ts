import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "@fastify/type-provider-zod";

import {
  createTaskBodySchema,
  createdTaskResponseSchema,
  taskErrorResponseSchema,
  tasksResponseSchema,
  type CreateTaskInput,
  type CreatedTaskResponse,
} from "./task.schema.js";
import { createTask, getTasks, TaskCreationError } from "./task.service.js";

export type CreateTask = (
  input: CreateTaskInput,
) => Promise<CreatedTaskResponse>;
export type GetTasks = () => Promise<CreatedTaskResponse[]>;

interface TaskRoutesOptions {
  createTask?: CreateTask;
  getTasks?: GetTasks;
}

export const taskRoutes: FastifyPluginAsync<TaskRoutesOptions> = async (
  app,
  options,
) => {
  const create = options.createTask ?? createTask;
  const loadTasks = options.getTasks ?? getTasks;

  app.withTypeProvider<ZodTypeProvider>().get(
    "/v1/tasks",
    {
      schema: {
        response: {
          200: tasksResponseSchema,
        },
      },
    },
    async () => loadTasks(),
  );

  app.withTypeProvider<ZodTypeProvider>().post(
    "/v1/tasks",
    {
      schema: {
        body: createTaskBodySchema,
        response: {
          201: createdTaskResponseSchema,
          422: taskErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const task = await create(request.body);
        return reply.code(201).send(task);
      } catch (error) {
        if (error instanceof TaskCreationError) {
          return reply.code(error.statusCode).send({
            code: error.code,
            message: error.message,
          });
        }

        throw error;
      }
    },
  );
};
