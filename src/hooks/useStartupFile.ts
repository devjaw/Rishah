import { useEffect } from 'react';
import type { Editor } from 'tldraw';
import { invoke } from '@tauri-apps/api/core';
import { loadFile } from '../file/fileOps';

export function useStartupFile(editor: Editor | null): void {
  useEffect(() => {
    if (!editor) return;
    const fetchData = async () => {
      const result: [string, string] | null = await invoke('get_startup_file_content');
      if (!result || !result[0] || !result[1]) return;
      loadFile(editor, result[1], result[0]);
    };
    fetchData();
  }, [editor]);
}
