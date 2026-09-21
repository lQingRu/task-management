import { z } from "zod";

export const developerSkillSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
});

export const developerSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  skills: z.array(developerSkillSchema),
});

export const developersResponseSchema = z.array(developerSchema);

export type DeveloperResponse = z.infer<typeof developerSchema>;
