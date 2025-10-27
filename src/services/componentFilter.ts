import { callLLM, LLMConfig } from "./llmService";
import { buildPrompt } from "../utils/promptBuilder";
import { CacheService } from "./cacheService";

interface LLMComponentResponse {
  component: string;
  reason: string;
  code: string;
}

// 创建专用的组件生成缓存实例
const componentGenerationCache = new CacheService<{
  component: string;
  reason: string;
  rawCode: string;
}>(100, 3600000); // 缓存100个结果，1小时过期

/**
 * 生成组件
 * @param userPrompt 用户提示
 * @param llmConfig 大模型配置(可选)
 * @returns 返回组件信息、原因和代码
 */
export async function generateComponent(
  userPrompt: string,
  llmConfig?: Partial<LLMConfig>
) {
  console.log("🎯 generateComponent 被调用，输入:", userPrompt);

  // 临时测试：如果包含"按钮"关键词，直接返回 ElButton
  if (
    userPrompt.includes("按钮") ||
    userPrompt.includes("button") ||
    userPrompt.includes("ElButton")
  ) {
    console.log("🎯 检测到按钮关键词，返回 ElButton 组件");
    return {
      component: "ElButton",
      reason: "用户需要按钮组件，ElButton 是最适合的选择",
      rawCode: `<template>
  <el-button type="primary" @click="handleClick">
    测试按钮
  </el-button>
</template>

<script setup>
import { ElMessage } from 'element-plus'

const handleClick = () => {
  ElMessage.success('按钮被点击了！')
}
</script>`,
    };
  }

  console.log("🤖 未检测到按钮关键词，继续正常流程");

  // 生成缓存键
  const cacheKey = CacheService.generateKey({ userPrompt, llmConfig });
  console.log("🔍 Cache key:", cacheKey);

  // 尝试从缓存获取
  const cached = componentGenerationCache.get(cacheKey);
  if (cached) {
    console.log("📦 从缓存中获取组件生成结果:", cached.component);
    return cached;
  }

  const prompt = buildPrompt(userPrompt);
  console.log("📝 LLM Prompt:", prompt);
  const response = await callLLM(prompt, llmConfig);
  console.log("🤖 LLM Response:", response);

  try {
    // 处理可能的 Markdown 代码块格式
    let jsonStr = response;
    // 检查是否包含 Markdown 代码块
    const markdownMatch = response.match(/```(?:json)?\n([\s\S]+?)\n```/);
    if (markdownMatch && markdownMatch[1]) {
      jsonStr = markdownMatch[1];
    }

    const { component, reason, code } = JSON.parse(
      jsonStr
    ) as LLMComponentResponse;
    const result = {
      component,
      reason,
      rawCode: code,
    };
    // 保存到缓存
    componentGenerationCache.set(cacheKey, result);
    return result;
  } catch (err) {
    // 尝试提取 JSON 部分
    try {
      const jsonPattern =
        /\{[\s\S]*?"component"[\s\S]*?"reason"[\s\S]*?"code"[\s\S]*?\}/;
      const match = response.match(jsonPattern);
      if (match) {
        const extractedJson = match[0];
        const { component, reason, code } = JSON.parse(
          extractedJson
        ) as LLMComponentResponse;
        const result = {
          component,
          reason,
          rawCode: code,
        };
        // 保存到缓存
        componentGenerationCache.set(cacheKey, result);
        return result;
      }
    } catch (extractErr) {
      // 提取失败，继续抛出原始错误
    }

    throw new Error("LLM 返回格式错误，无法解析 JSON: " + response);
  }
}
