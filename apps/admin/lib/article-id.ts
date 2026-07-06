export function isObjectId(value: string): boolean {
  return /^[0-9a-f]{24}$/.test(value);
}
