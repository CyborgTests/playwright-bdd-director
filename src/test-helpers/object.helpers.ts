/* eslint-disable @typescript-eslint/no-explicit-any */

export function getNestedField(obj: any, path: string): any {
  return path
    .replace(/\[(\d+)\]/g, '.$1')
    .replace(/^\./, '')
    .split('.')
    .reduce((acc, key) => (acc !== undefined ? acc[key] : undefined), obj)
}
