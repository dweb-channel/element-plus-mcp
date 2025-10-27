import { LLMConfig } from './llmService';
import { GenerateComponentTool } from '../tools/generate-component-tool.js';

/**
 * MCP适配器 - HTTP API 的简化包装层
 * 
 * 注意：此类仅用于向后兼容 HTTP API 端点
 * 内部使用 GenerateComponentTool（BaseTool 模式）
 * 
 * @deprecated 新代码应直接使用 GenerateComponentTool
 */
export class MCPAdapter {
  private generateTool = new GenerateComponentTool();

  /**
   * 生成组件的适配方法
   * 将 HTTP API 参数转换为 GenerateComponentTool 格式
   * @param params HTTP API 传入的参数
   * @returns 返回组件生成结果
   */
  public async generateComponentFromMCP(params: {
    description: string;
    componentType?: string;
    stylePreference?: string;
    featuresRequired?: string[];
    llmConfig?: Partial<LLMConfig>;
  }) {
    try {
      // 构建完整的描述（合并所有参数）
      let fullDescription = params.description;
      
      if (params.componentType) {
        fullDescription += `\n组件类型：${params.componentType}`;
      }
      
      if (params.stylePreference) {
        fullDescription += `\n样式要求：${params.stylePreference}`;
      }
      
      if (params.featuresRequired && params.featuresRequired.length > 0) {
        fullDescription += `\n功能要求：${params.featuresRequired.join('、')}`;
      }

      // 调用新的 GenerateComponentTool
      const result = await this.generateTool.execute({
        description: fullDescription,
        componentType: params.componentType,
        llmConfig: params.llmConfig,
      });

      // 从 MCP 格式提取数据
      const textContent = result.content.find(c => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('工具返回格式错误');
      }

      // 解析返回的文本内容
      // GenerateComponentTool 返回的是 Markdown 格式的文本
      // 我们需要从中提取组件信息
      const text = textContent.text;
      
      // 简单的正则提取（根据 GenerateComponentTool 的返回格式）
      const componentMatch = text.match(/## ✅ 生成组件: (.+)/);
      const reasonMatch = text.match(/\*\*选择原因\*\*: (.+)/);
      const codeMatch = text.match(/```vue\n([\s\S]+?)\n```/);

      return {
        componentName: componentMatch?.[1] || 'unknown',
        code: codeMatch?.[1] || '',
        previewUrl: 'http://localhost:3000/api/preview/get/0',
        explanation: reasonMatch?.[1] || '组件生成成功',
      };
    } catch (error) {
      console.error('组件生成失败:', error);
      throw new Error(`组件生成失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 测试LLM连接的适配方法
   * @deprecated 此方法将在未来版本移除
   */
  public async testLLMConnection(llmConfig: Partial<LLMConfig>) {
    try {
      const result = await this.generateTool.execute({
        description: '生成一个简单的按钮组件用于测试',
        llmConfig,
      });

      return {
        success: true,
        response: { message: 'LLM连接测试成功' },
      };
    } catch (error) {
      console.error('LLM连接测试失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
