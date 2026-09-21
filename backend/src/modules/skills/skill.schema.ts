import { z } from "zod";

export const skillSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
});

export const skillsResponseSchema = z.array(skillSchema);

export type SkillResponse = z.infer<typeof skillSchema>;
