// 环境变量类型定义
declare namespace NodeJS {
  interface ProcessEnv {
    // DeepSeek API配置
    DEEPSEEK_API_URL?: string;
    DEEPSEEK_API_KEY?: string;
    
    // OpenAI API配置
    OPENAI_API_URL?: string;
    OPENAI_API_KEY?: string;
    
    // Anthropic API配置
    ANTHROPIC_API_URL?: string;
    ANTHROPIC_API_KEY?: string;
    
    // Google Gemini API配置
    GEMINI_API_URL?: string;
    GEMINI_API_KEY?: string;
    
    // 默认模型类型
    DEFAULT_LLM_MODEL_TYPE?: string;
    DEFAULT_LLM_MODEL_NAME?: string;
    
    // 端口配置
    PORT?: string;
  }
}
