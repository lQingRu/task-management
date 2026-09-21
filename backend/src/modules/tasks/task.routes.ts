import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "@fastify/type-provider-zod";

import {
  createTaskBodySchema,
  createdTaskResponseSchema,
  taskErrorResponseSchema,
  type CreateTaskInput,
  type CreatedTaskResponse,
} from "./task.schema.js";
import { createTask, TaskCreationError } from "./task.service.js";

export type CreateTask = (
  input: CreateTaskInput,
) => Promise<CreatedTaskResponse>;

interface TaskRoutesOptions {
  createTask?: CreateTask;
}

export const taskRoutes: FastifyPluginAsync<TaskRoutesOptions> = async (
  app,
  options,
) => {
  const create = options.createTask ?? createTask;

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
