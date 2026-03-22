import { useState } from 'react';
import {
  selectBatchDelete,
  selectBatchMove,
  selectSelectedPaths,
} from '../../../app/store/selectors';
import { useAppStore } from '../../../app/store/useAppStore';
import { downloadUrl } from '../../../shared/api/files';
import type { FileItem } from '../../../shared/types';

export function useBatchActions(items: FileItem[]) {
  const selectedPaths = useAppStore(selectSelectedPaths);
  const batchDelete = useAppStore(selectBatchDelete);
  const batchMove = useAppStore(selectBatchMove);
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);

  const selectedFiles = selectedPaths.size > 0
    ? items.filter((item) => selectedPaths.has(item.path) && item.type === 'file')
    : [];

  function handleDownload() {
    for (const file of selectedFiles) {
      const link = document.createElement('a');
      link.href = downloadUrl(file.path);
      link.download = file.name;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  async function handleTrash() {
    const paths = [...selectedPaths];

    if (!window.confirm(`Move ${paths.length} item(s) to trash?`)) {
      return;
    }

    await batchDelete(paths);
  }

  async function handleMove(destinationPath: string) {
    const paths = [...selectedPaths];
    if (destinationPath === '') {
      destinationPath = '/';
    }
    await batchMove(paths, destinationPath);
    setFolderPickerOpen(false);
  }

  return {
    selectedFiles,
    handleDownload,
    handleTrash,
    handleMove,
    folderPickerOpen,
    setFolderPickerOpen,
  };
}
