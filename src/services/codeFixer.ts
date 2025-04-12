import { fixVueCode } from '../utils/ast';

export function fixCode(rawCode: string): string {
  return fixVueCode(rawCode);
}