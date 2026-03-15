import type { FileItem, SortDirection, SortField } from '../../../shared/types';

function compareItems(
  left: FileItem,
  right: FileItem,
  sortField: SortField,
  direction: SortDirection
) {
  const factor = direction === 'asc' ? 1 : -1;

  if (left.type !== right.type) {
    return left.type === 'directory' ? -1 : 1;
  }

  if (sortField === 'size') {
    return (left.size - right.size) * factor || left.name.localeCompare(right.name);
  }

  if (sortField === 'modifiedAt') {
    return (
      (new Date(left.modifiedAt).getTime() - new Date(right.modifiedAt).getTime()) * factor ||
      left.name.localeCompare(right.name)
    );
  }

  return left.name.localeCompare(right.name) * factor;
}

export function sortItems(
  items: FileItem[],
  sortField: SortField,
  direction: SortDirection
): FileItem[] {
  return [...items].sort((left, right) => compareItems(left, right, sortField, direction));
}
