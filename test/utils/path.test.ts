import { describe, it, expect } from 'vitest';
import { getFilename } from '../../src/utils/path';

describe('getFilename', () => {
  it('extracts filename from a path', () => {
    expect(getFilename('/home/user/drawing.tldr')).toBe('drawing.tldr');
  });

  it('returns the input when there is no separator', () => {
    expect(getFilename('drawing.tldr')).toBe('drawing.tldr');
  });
});
