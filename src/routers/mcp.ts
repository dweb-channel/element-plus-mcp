import Router from "koa-router";
import type { ParameterizedContext } from "koa";
import { generateComponent } from "../services/componentFilter";
import { fixCode } from "../services/codeFixer";
import { PreviewService } from "../services/previewService";
import { LLMConfig, LLMModelType } from "../services/llmService";

const router = new Router();

// 定义接口，确保类型安全
interface GenerateRequest {
  userPrompt: string;
  llmConfig?: {
    modelType?: LLMModelType;
    modelName?: string;
    apiUrl?: string;
    apiKey?: string;
    temperature?: number;
    maxTokens?: number;
    otherParams?: Record<string, any>;
  };
}

/**
 * 生成组件的路由处理器
 * 支持通过llmConfig参数配置使用的大模型
 */
router.post("/generate", async (ctx: ParameterizedContext) => {
  // 使用类型断言来处理 body 属性
  const { userPrompt, llmConfig } = (ctx.request as any)
    .body as GenerateRequest;

  // 验证必要的输入参数
  if (!userPrompt) {
    ctx.status = 400;
    ctx.body = {
      message: "缺少必要的userPrompt参数",
    };
    return;
  }

  try {
    // 使用传入的大模型配置(如果有)调用generateComponent
    const { component, reason, rawCode } = await generateComponent(
      userPrompt,
      llmConfig
    );
    const previewUrl = await PreviewService.instance.buildPreview(rawCode);

    ctx.body = {
      component,
      reason,
      rawCode,
      previewUrl,
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      message: "MCP生成失败",
      error: error.message,
    };
  }
});

/**
 * 获取支持的模型类型
 * 前端可以通过这个接口获知系统支持哪些大模型类型
 */
router.get("/models", async (ctx: ParameterizedContext) => {
  try {
    // 所有支持的模型类型及其默认配置
    const supportedModels = {
      deepseek: {
        defaultModelName: "deepseek-chat",
        description: "DeepSeek大模型，适合复杂推理和代码生成",
        needsApiKey: true,
      },
      openai: {
        defaultModelName: "gpt-3.5-turbo",
        alternativeModels: ["gpt-4", "gpt-4-turbo"],
        description: "OpenAI GPT系列模型，通用能力强",
        needsApiKey: true,
      },
      anthropic: {
        defaultModelName: "claude-3-opus-20240229",
        alternativeModels: [
          "claude-3-sonnet-20240229",
          "claude-3-haiku-20240307",
        ],
        description: "Anthropic Claude系列模型，逻辑性强",
        needsApiKey: true,
      },
      gemini: {
        defaultModelName: "gemini-pro",
        alternativeModels: ["gemini-ultra"],
        description: "Google Gemini系列模型，性能均衡",
        needsApiKey: true,
      },
      custom: {
        description: "自定义模型配置，需提供完整API参数",
        needsApiKey: true,
        needsCustomConfig: true,
      },
    };

    ctx.body = {
      supportedModels,
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      message: "获取模型信息失败",
      error: error.message,
    };
  }
});

/**
 * 模型测试接口
 * 用于测试LLM配置是否有效
 */
router.post("/test-model", async (ctx: ParameterizedContext) => {
  const { llmConfig } = (ctx.request as any).body;

  if (!llmConfig || !llmConfig.modelType) {
    ctx.status = 400;
    ctx.body = {
      message: "缺少必要的llmConfig参数",
    };
    return;
  }

  try {
    // 使用一个简单的测试提示来测试模型连接
    const testPrompt = "返回'模型连接测试成功'这几个字";
    const { component, reason } = await generateComponent(
      testPrompt,
      llmConfig as Partial<LLMConfig>
    );

    ctx.body = {
      success: true,
      message: "模型连接测试成功",
      response: { component, reason },
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: "模型连接测试失败",
      error: error.message,
    };
  }
});

export default router;
