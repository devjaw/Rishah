import { atom } from 'tldraw';

export const currentFilePath = atom<string | null>('currentFilePath', null);
