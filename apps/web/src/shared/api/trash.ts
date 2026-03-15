import { request } from './client';
import type { FileItem, TrashListing } from '../types';

export function listTrash(): Promise<TrashListing> {
  return request<TrashListing>('/api/trash');
}

export function restoreTrash(id: string, csrfToken: string): Promise<FileItem> {
  return request<{ item: FileItem }>('/api/trash/restore', {
    method: 'POST',
    csrfToken,
    body: { id },
  }).then((payload) => payload.item);
}

export function deleteTrash(id: string, csrfToken: string): Promise<void> {
  return request<void>(`/api/trash/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    csrfToken,
  });
}
