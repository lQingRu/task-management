import { apiRequest } from './client';
import type { ApiDeveloper } from './contracts';

export function getDevelopers(): Promise<ApiDeveloper[]> {
  return apiRequest<ApiDeveloper[]>('/v1/developers');
}
