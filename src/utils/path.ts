export function getFilename(filePath: string): string {
  return filePath.split('/').pop() || filePath.split('\\').pop() || filePath;
}
