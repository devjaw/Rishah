import { useReactor } from 'tldraw';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { currentFilePath } from '../file/fileState';
import { getFilename } from '../utils/path';

export function useWindowTitle(): void {
  useReactor(
    'update-window-title',
    () => {
      const path = currentFilePath.get();
      const title = path ? `Rishah - ${getFilename(path)}` : 'Rishah - Untitled';
      getCurrentWindow().setTitle(title);
    },
    [],
  );
}
