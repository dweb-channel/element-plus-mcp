import { callLLM } from './llmService';
import { buildPrompt } from '../utils/promptBuilder';

interface LLMComponentResponse {
  component: string;
  reason: string;
  code: string;
}

export async function generateComponent(userPrompt: string) {
  const prompt = buildPrompt(userPrompt);
  const response = await callLLM(prompt);

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