import { useEffect, type RefObject } from 'react';
import type { Editor } from 'tldraw';
import type { MessageInstance } from 'antd/es/message/interface';
import { saveFile, saveFileAs, type Feedback } from '../file/fileOps';

type Params = {
  messageApi: MessageInstance;
  editorRef: RefObject<Editor | null>;
};

export function useSaveShortcuts({ messageApi, editorRef }: Params): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const fb: Feedback = {
        success: (m) => messageApi.open({ type: 'success', content: m }),
        error: (m) => messageApi.open({ type: 'error', content: m }),
      };
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveFileAs(editorRef.current, fb);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveFile(editorRef.current, fb);
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [messageApi]);
}
