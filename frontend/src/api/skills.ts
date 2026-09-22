import { apiRequest } from './client';
import type { ApiSkill } from './contracts';

export function getSkills(): Promise<ApiSkill[]> {
  return apiRequest<ApiSkill[]>('/v1/skills');
}
