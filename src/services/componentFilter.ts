import { callLLM, LLMConfig } from './llmService';
import { buildPrompt } from '../utils/promptBuilder';

interface LLMComponentResponse {
  component: string;
  reason: string;
  code: string;
}

/**
 * 生成组件
 * @param userPrompt 用户提示
 * @param llmConfig 大模型配置(可选)
 * @returns 返回组件信息、原因和代码
 */
export async function generateComponent(userPrompt: string, llmConfig?: Partial<LLMConfig>) {
  const prompt = buildPrompt(userPrompt);
  const response = await callLLM(prompt, llmConfig);

  try {
    // 处理可能的 Markdown 代码块格式
    let jsonStr = response;
    
    // 检查是否包含 Markdown 代码块
    const markdownMatch = response.match(/```(?:json)?\n([\s\S]+?)\n```/);
    if (markdownMatch && markdownMatch[1]) {
      jsonStr = markdownMatch[1];
    }
    
    const { component, reason, code } = JSON.parse(jsonStr) as LLMComponentResponse;
    return {
      component,
      reason,
      rawCode: code,
    };
  } catch (err) {
    // 尝试提取 JSON 部分
    try {
      const jsonPattern = /\{[\s\S]*?"component"[\s\S]*?"reason"[\s\S]*?"code"[\s\S]*?\}/;
      const match = response.match(jsonPattern);
      if (match) {
        const extractedJson = match[0];
        const { component, reason, code } = JSON.parse(extractedJson) as LLMComponentResponse;
        return {
          component,
          reason,
          rawCode: code,
        };
      }
    } catch (extractErr) {
      // 提取失败，继续抛出原始错误
    }
    
    throw new Error('LLM 返回格式错误，无法解析 JSON: ' + response);
  }
}