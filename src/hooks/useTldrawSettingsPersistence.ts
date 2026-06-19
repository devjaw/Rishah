import { useEffect } from 'react';
import { Editor, useReactor } from 'tldraw';
import {
  initializeUserPreferences,
  loadInstanceState,
  saveInstanceState,
  saveUserPreferences,
} from '../utils/settingsManager';

export function useTldrawSettingsPersistence(editor: Editor | null): void {
  useEffect(() => {
    if (!editor) return;

    initializeUserPreferences().then((savedPrefs) => {
      editor.user.updateUserPreferences(savedPrefs);
    });

    loadInstanceState().then((savedInstanceState) => {
      if (!savedInstanceState) return;
      editor.updateInstanceState({ isGridMode: savedInstanceState.isGridMode });
    });
  }, [editor]);

  useReactor(
    'save-grid-mode',
    () => {
      if (!editor) return;
      const isGridMode = editor.getInstanceState().isGridMode;
      saveInstanceState({ isGridMode });
    },
    [editor],
  );

  useReactor(
    'save-user-preferences',
    () => {
      if (!editor) return;
      const userPrefs = editor.user.getUserPreferences();
      saveUserPreferences(userPrefs);
    },
    [editor],
  );
}
