import { useEffect } from 'react';
import { Editor, useValue } from 'tldraw';
import {
  initializeUserPreferences,
  loadInstanceState,
  saveInstanceState,
  saveUserPreferences,
} from '../utils/settingsManager';

export function useTldrawSettingsPersistence(editor: Editor | null): void {
  useEffect(() => {
    if (!editor) return;


    console.log('useTldrawSettingsPersistence');

    initializeUserPreferences().then((savedPrefs) => {
      editor.user.updateUserPreferences(savedPrefs);
    });

    loadInstanceState().then((savedInstanceState) => {
      if (!savedInstanceState) return;
      editor.updateInstanceState({ isGridMode: savedInstanceState.isGridMode });
    });
  }, [editor]);

  const isGridMode = useValue(
    'isGridMode',
    () => editor?.getInstanceState().isGridMode ?? null,
    [editor],
  );

  useEffect(() => {
    if (isGridMode === null) return;
    console.log('save-grid-mode fired', { isGridMode });
    saveInstanceState({ isGridMode });
  }, [isGridMode]);

  const userPrefs = useValue(
    'userPrefs',
    () => editor?.user.getUserPreferences() ?? null,
    [editor],
  );

  useEffect(() => {
    if (!userPrefs) return;
    console.log('save-user-preferences fired');
    saveUserPreferences(userPrefs);
  }, [userPrefs]);
}
