import { useEffect, useRef } from 'react';
import type { Editor } from 'tldraw';
import { setupAppMenu, type AppMenuHandlers } from '../menu/appMenu';
import { newFile, openFile, saveFile, saveFileAs, type Feedback } from '../file/fileOps';

type Params = {
  editor: Editor | null;
  feedback: Feedback;
};

export function useAppMenu({ editor, feedback }: Params): void {
  const handlersRef = useRef<AppMenuHandlers | null>(null);
  handlersRef.current = {
    onNew: () => newFile(editor, feedback),
    onOpen: () => openFile(editor, feedback),
    onSave: () => saveFile(editor, feedback),
    onSaveAs: () => saveFileAs(editor, feedback),
  };

  useEffect(() => {
    setupAppMenu({
      onNew: () => handlersRef.current?.onNew(),
      onOpen: () => handlersRef.current?.onOpen(),
      onSave: () => handlersRef.current?.onSave(),
      onSaveAs: () => handlersRef.current?.onSaveAs(),
    });
  }, []);
}
