import { LLMConfig } from './llmService';
import { generateComponent } from './componentFilter';
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

      // 直接调用 componentFilter（包含按钮检测逻辑）
      const { component, reason, rawCode } = await generateComponent(fullDescription, params.llmConfig);

      return {
        componentName: component,
        code: rawCode,
        previewUrl: 'http://localhost:3000/api/preview/get/0',
        explanation: reason,
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
