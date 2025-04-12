import axios from "axios";

// LLM模型类型定义
export type LLMModelType = 'deepseek' | 'openai' | 'anthropic' | 'gemini' | 'custom';

// LLM配置接口
export interface LLMConfig {
  modelType: LLMModelType;
  modelName?: string;
  apiUrl?: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  otherParams?: Record<string, any>;
}

// 默认的LLM配置
const defaultLLMConfig: LLMConfig = {
  modelType: 'deepseek',
  modelName: 'deepseek-chat',
  temperature: 0.7,
};

/**
 * 调用LLM服务
 * @param prompt 提示语
 * @param config LLM配置，可选，默认使用deepseek
 * @returns 返回LLM响应内容
 */
export async function callLLM(prompt: string, config?: Partial<LLMConfig>): Promise<string> {
  // 合并默认配置和用户提供的配置
  const finalConfig: LLMConfig = { ...defaultLLMConfig, ...config };
  
  // 根据不同的模型类型构建不同的请求
  switch (finalConfig.modelType) {
    case 'deepseek':
      return callDeepseekLLM(prompt, finalConfig);
    case 'openai':
      return callOpenAILLM(prompt, finalConfig);
    case 'anthropic':
      return callAnthropicLLM(prompt, finalConfig);
    case 'gemini':
      return callGeminiLLM(prompt, finalConfig);
    case 'custom':
      return callCustomLLM(prompt, finalConfig);
    default:
      throw new Error(`不支持的模型类型: ${finalConfig.modelType}`);
  }
}

/**
 * 调用DeepSeek模型
 */
async function callDeepseekLLM(prompt: string, config: LLMConfig): Promise<string> {
  const apiUrl = config.apiUrl || process.env.DEEPSEEK_API_URL!;
  const apiKey = config.apiKey || process.env.DEEPSEEK_API_KEY!;
  
  const response = await axios.post(
    apiUrl,
    {
      model: config.modelName || "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      temperature: config.temperature || 0.7,
      max_tokens: config.maxTokens,
      ...config.otherParams,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data.choices?.[0]?.message?.content || "";
}

/**
 * 调用OpenAI模型
 */
async function callOpenAILLM(prompt: string, config: LLMConfig): Promise<string> {
  const apiUrl = config.apiUrl || process.env.OPENAI_API_URL || "https://api.openai.com/v1/chat/completions";
  const apiKey = config.apiKey || process.env.OPENAI_API_KEY!;
  
  const response = await axios.post(
    apiUrl,
    {
      model: config.modelName || "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: config.temperature || 0.7,
      max_tokens: config.maxTokens,
      ...config.otherParams,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data.choices?.[0]?.message?.content || "";
}

/**
 * 调用Anthropic模型
 */
async function callAnthropicLLM(prompt: string, config: LLMConfig): Promise<string> {
  const apiUrl = config.apiUrl || process.env.ANTHROPIC_API_URL || "https://api.anthropic.com/v1/messages";
  const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY!;
  
  const response = await axios.post(
    apiUrl,
    {
      model: config.modelName || "claude-3-opus-20240229",
      messages: [{ role: "user", content: prompt }],
      temperature: config.temperature || 0.7,
      max_tokens: config.maxTokens || 4096,
      ...config.otherParams,
    },
    {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
    }
  );

  return response.data.content?.[0]?.text || "";
}

/**
 * 调用Gemini模型
 */
async function callGeminiLLM(prompt: string, config: LLMConfig): Promise<string> {
  const apiUrl = config.apiUrl || process.env.GEMINI_API_URL || "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";
  const apiKey = config.apiKey || process.env.GEMINI_API_KEY!;
  
  const response = await axios.post(
    `${apiUrl}?key=${apiKey}`,
    {
      contents: [{
        role: "user",
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: config.temperature || 0.7,
        maxOutputTokens: config.maxTokens,
        ...config.otherParams,
      },
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  return response.data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

/**
 * 调用自定义模型
 * 用户可以提供完全自定义的配置来调用任何兼容的API
 */
async function callCustomLLM(prompt: string, config: LLMConfig): Promise<string> {
  if (!config.apiUrl) {
    throw new Error("自定义模型调用需要提供apiUrl");
  }
  
  const apiKey = config.apiKey || "";
  
  try {
    // 这里允许完全自定义请求格式和响应处理
    const response = await axios.post(
      config.apiUrl,
      config.otherParams?.requestBody || {
        prompt,
        ...config.otherParams,
      },
      {
        headers: {
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          "Content-Type": "application/json",
          ...config.otherParams?.headers,
        },
      }
    );

    // 允许自定义响应处理逻辑
    if (config.otherParams?.responseExtractor && typeof config.otherParams.responseExtractor === 'function') {
      return config.otherParams.responseExtractor(response.data) || "";
    }
    
    // 默认尝试一些常见的响应格式
    return response.data.content || 
           response.data.text || 
           response.data.message || 
           response.data.choices?.[0]?.message?.content || 
           response.data.choices?.[0]?.text || 
           response.data.response || 
           response.data.result || 
           response.data.output || 
           JSON.stringify(response.data);
  } catch (error) {
    console.error("自定义LLM调用失败:", error);
    throw new Error(`自定义LLM调用失败: ${error.message}`);
  }
}
