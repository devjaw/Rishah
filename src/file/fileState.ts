import { atom } from 'tldraw';

export const currentFilePath = atom<string | null>('currentFilePath', null);

export const savedSnapshot = atom<string | null>('savedSnapshot', null);
