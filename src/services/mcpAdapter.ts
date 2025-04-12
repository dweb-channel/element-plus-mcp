import { LLMConfig } from './llmService';
import { generateComponent } from './componentFilter';
import { fixCode } from './codeFixer';
import { buildPreview } from './previewService';

/**
 * MCP适配器 - 连接MCP协议与现有组件生成服务
 * 用于转换MCP工具调用到现有服务的调用
 */
export class MCPAdapter {
  /**
   * 生成组件的适配方法
   * 将MCP工具的参数转换为内部服务所需的格式
   * @param params MCP工具传入的参数
   * @returns 返回符合MCP响应格式的组件生成结果
   */
  public async generateComponentFromMCP(params: {
    description: string;
    componentType?: string;
    stylePreference?: string;
    featuresRequired?: string[];
    llmConfig?: Partial<LLMConfig>;
  }) {
    try {
      // 构建用户提示
      let userPrompt = params.description;
      
      // 添加组件类型信息
      if (params.componentType) {
        userPrompt += `\n需要的组件类型：${params.componentType}`;
      }
      
      // 添加样式偏好信息
      if (params.stylePreference) {
        userPrompt += `\n样式要求：${params.stylePreference}`;
      }
      
      // 添加功能要求
      if (params.featuresRequired && params.featuresRequired.length > 0) {
        userPrompt += `\n功能要求：${params.featuresRequired.join('、')}`;
      }
      
      // 调用原有的组件生成服务
      const { component, reason, rawCode } = await generateComponent(userPrompt, params.llmConfig);
      
      // 修复代码
      const fixedCode = fixCode(rawCode);
      
      // 构建预览
      const previewUrl = await buildPreview(fixedCode);
      
      // 返回符合MCP响应格式的数据
      return {
        componentName: component,
        code: fixedCode,
        previewUrl: previewUrl,
        explanation: reason
      };
    } catch (error) {
      console.error('MCP组件生成失败:', error);
      throw new Error(`MCP组件生成失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * 测试LLM连接的适配方法
   * @param llmConfig LLM配置参数
   * @returns 返回测试结果
   */
  public async testLLMConnection(llmConfig: Partial<LLMConfig>) {
    try {
      // 使用一个简单的提示测试LLM连接
      const testPrompt = "返回'MCP测试成功'";
      const { component, reason } = await generateComponent(testPrompt, llmConfig);
      
      return {
        success: true,
        response: { component, reason }
      };
    } catch (error) {
      console.error('LLM连接测试失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
