import { request } from './client';
import type { SessionState } from '../types';

export function getSession(): Promise<SessionState> {
  return request<SessionState>('/api/me');
}

export function login(username: string, password: string): Promise<SessionState> {
  return request<SessionState>('/api/auth/login', {
    method: 'POST',
    body: { username, password },
  });
}

export function logout(csrfToken: string): Promise<void> {
  return request<void>('/api/auth/logout', {
    method: 'POST',
    csrfToken,
  });
}
