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

/**
 * 修复模板中未闭合的标签
 * @param template 模板字符串
 * @returns 修复后的模板字符串
 */
function fixTemplateClosingTags(template: string): string {
  // 确保常见标签都正确闭合
  const tagStack: string[] = [];
  const openTagRegex = /<([a-zA-Z][a-zA-Z0-9:-]*)([^>]*)>/g;
  const closeTagRegex = /<\/([a-zA-Z][a-zA-Z0-9:-]*)>/g;
  
  let match;
  let lastIndex = 0;
  let fixedTemplate = template;
  
  // 检查是否有自闭合标签的情况
  const selfClosingCheck = /<([a-zA-Z][a-zA-Z0-9:-]*)[^>]*\/>/g;
  const selfClosingTags = new Set();
  while ((match = selfClosingCheck.exec(template)) !== null) {
    selfClosingTags.add(match[1]);
  }
  
  // 检查未闭合的标签
  while ((match = openTagRegex.exec(template)) !== null) {
    const tagName = match[1];
    const attributes = match[2];
    // 忽略自闭合标签
    if (attributes.trim().endsWith('/') || selfClosingTags.has(tagName)) {
      continue;
    }
    tagStack.push(tagName);
  }
  
  // 检查闭合标签
  while ((match = closeTagRegex.exec(template)) !== null) {
    const tagName = match[1];
    const lastOpenTag = tagStack.pop();
    
    if (lastOpenTag !== tagName) {
      // 标签不匹配，可能需要添加闭合标签
      if (lastOpenTag) {
        tagStack.push(lastOpenTag); // 恢复弹出的标签
      }
    }
  }
  
  // 添加未闭合的标签
  if (tagStack.length > 0) {
    let closingTags = '';
    // 从后向前添加闭合标签
    for (let i = tagStack.length - 1; i >= 0; i--) {
      closingTags += `</${tagStack[i]}>`;
    }
    fixedTemplate += closingTags;
  }
  
  return fixedTemplate;
}
