import { parse } from '@babel/parser';
import traverse from '@babel/traverse';

export function fixVueCode(code: string): string {
  try {
    parse(code, { sourceType: 'module', plugins: ['typescript'] });
    return code;
  } catch (e) {
    return code.replace(/<([a-zA-Z\-]+)([^\/>]*)(?<!\/)>/g, '<$1$2 />');
  }
}