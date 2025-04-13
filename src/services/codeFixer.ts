import { fixVueCode } from '../utils/ast';

/**
 * 修复代码
 * @param rawCode 原始代码
 * @returns 修复后的代码
 */
export function fixCode(rawCode: string): string {
  console.log("11",rawCode)
  const fixData = fixVueCode(rawCode);
  console.log("222",fixCode)
  return fixData
}