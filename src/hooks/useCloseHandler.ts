import { useEffect, type RefObject } from 'react';
import type { Editor } from 'tldraw';
import type { MessageInstance } from 'antd/es/message/interface';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { promptSaveBeforeClose, type Feedback } from '../file/fileOps';

type Params = {
  messageApi: MessageInstance;
  editorRef: RefObject<Editor | null>;
};

export function useCloseHandler({ messageApi, editorRef }: Params): void {
  useEffect(() => {
    const unlistenPromise = getCurrentWindow().onCloseRequested(async (event) => {
      event.preventDefault();
      const fb: Feedback = {
        success: (m) => messageApi.open({ type: 'success', content: m }),
        error: (m) => messageApi.open({ type: 'error', content: m }),
      };

      let choice;
      try {
        choice = await promptSaveBeforeClose(editorRef.current, fb);
      } catch (error) {
        console.error('Error handling close request:', error);
        return;
      }

      if (choice === 'cancel') return;

      try {
        await getCurrentWindow().destroy();
      } catch (destroyError) {
        console.error('Error destroying window:', destroyError);
      }
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten?.());
    };
  }, [messageApi]);
}
