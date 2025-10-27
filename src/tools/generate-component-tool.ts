import { z } from "zod";
import { BaseTool, McpToolResult } from "../utils/base-tool.js";
import { generateComponent } from "../services/componentFilter.js";
import type { LLMConfig } from "../services/llmService.js";

/**
 * Element Plus 组件生成工具
 * 基于 BaseTool 抽象类实现
 */
export class GenerateComponentTool extends BaseTool {
  name = "generate-component";
  
  description = `根据用户描述生成 Element Plus 组件代码。
使用场景：
- 用户提到 /ui 或需要创建新的 UI 组件
- 用户描述了按钮、表单、表格、卡片等组件需求
- 用户需要快速原型设计

工具会返回完整的 Vue 3 组件代码（包含 <template>、<script setup> 和样式）。`;

  schema = z.object({
    description: z
      .string()
      .describe("用户对组件的详细描述，包括功能需求、样式要求等"),
    
    componentType: z
      .string()
      .optional()
      .describe("组件类型提示（如：button、table、form），用于优化组件搜索"),
    
    llmConfig: z
      .object({
        modelType: z.enum(["deepseek", "openai", "anthropic", "gemini", "custom"]).optional(),
        modelName: z.string().optional(),
        temperature: z.number().min(0).max(2).optional(),
      })
      .optional()
      .describe("可选的 LLM 配置，用于自定义模型行为"),
  });

  async execute({
    description,
    componentType,
    llmConfig,
  }: z.infer<typeof this.schema>): Promise<McpToolResult> {
    try {
      // 构建完整提示
      let fullPrompt = description;
      if (componentType) {
        fullPrompt = `${componentType}: ${description}`;
      }

      // 调用组件生成服务（自动使用缓存）
      const result = await generateComponent(fullPrompt, llmConfig as Partial<LLMConfig>);

      // 格式化返回结果
      const responseText = `
## ✅ 生成组件: ${result.component}

**选择原因**: ${result.reason}

### 📦 组件代码

\`\`\`vue
${result.rawCode}
\`\`\`

### 🔧 使用说明

1. 将代码保存为 \`.vue\` 文件
2. 在项目中导入并使用该组件
3. 根据需要调整样式和功能

### 📚 相关文档

- Element Plus 文档: https://element-plus.org
- 组件预览: http://localhost:3000/api/preview/get/0
`;

      return {
        content: [
          {
            type: "text",
            text: responseText,
          },
        ],
      };
    } catch (error) {
      console.error("组件生成失败:", error);
      
      return {
        content: [
          {
            type: "text",
            text: `## ❌ 组件生成失败

错误信息: ${error instanceof Error ? error.message : String(error)}

请检查：
1. API 密钥是否正确配置
2. 网络连接是否正常
3. 提示描述是否清晰

如需帮助，请查看日志或联系技术支持。`,
          },
        ],
      };
    }
  }
}
