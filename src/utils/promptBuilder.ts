import fullComponents from "../../data/element-plus-components.json";

export function buildPrompt(
  userPrompt: string,
  componentMeta = fullComponents
): string {
  return `
  用户需求：${userPrompt}

  以下是可用的 Element Plus 组件：
  ${componentMeta.map((c: any) => `- ${c.name}: ${c.description}`).join("\n")}

  请根据需求选择最合适的组件，并输出：
  {
    "component": "<组件名>",
    "reason": "<推荐理由>",
    "code": "<组件 Vue 示例代码>"
  }
  `;
}
