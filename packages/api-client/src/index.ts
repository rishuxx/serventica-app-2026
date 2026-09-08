import { ServenticaEnvironment } from '@serventica/config';
import { ApiErrorResponse } from '@serventica/types';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiErrorResponse;
  requestId?: string;
}

export class ServenticaApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = ServenticaEnvironment.api.baseUrl) {
    this.baseUrl = baseUrl;
  }

  async get<T>(path: string, token?: string): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers,
    });
    return (await response.json()) as ApiResponse<T>;
  }
}
