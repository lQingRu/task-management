const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const API_BASE_URL = (configuredBaseUrl || 'http://localhost:3001').replace(
  /\/$/,
  '',
);

interface ErrorResponse {
  message?: string;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiRequest<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const headers = new Headers(options?.headers);

  if (options?.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(
      'Unable to reach the server. Check that the backend is running.',
      0,
    );
  }

  if (!response.ok) {
    const fallbackMessage = `Request failed with status ${response.status}.`;
    let message = fallbackMessage;

    try {
      const error = (await response.json()) as ErrorResponse;
      message = error.message || fallbackMessage;
    } catch {
      // The server did not return its usual JSON error shape.
    }

    throw new ApiError(message, response.status);
  }

  return (await response.json()) as T;
}
