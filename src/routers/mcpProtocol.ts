import Router from 'koa-router';
import type { ParameterizedContext } from 'koa';
import { MCPAdapter } from '../services/mcpAdapter';
import { createMCPServer, createSSETransport } from '../services/mcpService';
import { LLMConfig } from '../services/llmService';

// 创建MCP服务器实例
const mcpServer = createMCPServer();
const mcpAdapter = new MCPAdapter();

const router = new Router();

/**
 * MCP SSE端点
 * 用于建立流式连接，处理MCP协议消息
 */
router.get('/sse', async (ctx: ParameterizedContext) => {
  // 设置SSE连接所需的响应头
  ctx.set('Content-Type', 'text/event-stream');
  ctx.set('Cache-Control', 'no-cache');
  ctx.set('Connection', 'keep-alive');
  
  // 处理SSE连接关闭
  ctx.req.on('close', () => {
    console.log('MCP SSE连接已关闭');
  });
  
  try {
    // 为当前请求创建一个新的SSE传输实例
    const sseTransport = createSSETransport('/sse', ctx.res);
    
    // 连接传输层到服务器
    await mcpServer.connect(sseTransport);
    
    // 保持连接打开直到客户端断开
    await new Promise<void>((resolve) => {
      ctx.req.on('close', () => {
        resolve();
      });
    });
  } catch (error) {
    console.error('SSE连接错误:', error);
    ctx.status = 500;
    ctx.body = { error: 'SSE连接失败' };
  }
});

/**
 * MCP工具执行辅助API
 * 用于在MCP协议外直接调用生成组件功能
 */
router.post('/execute-generate-tool', async (ctx: ParameterizedContext) => {
  try {
    const { description, componentType, stylePreference, featuresRequired, llmConfig } = (ctx.request as any).body;
    
    // 验证必要的输入参数
    if (!description) {
      ctx.status = 400;
      ctx.body = {
        message: '缺少必要的description参数',
      };
      return;
    }
    
    // 调用MCP适配器生成组件
    const result = await mcpAdapter.generateComponentFromMCP({
      description,
      componentType,
      stylePreference,
      featuresRequired,
      llmConfig: llmConfig as Partial<LLMConfig>
    });
    
    ctx.body = result;
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      message: 'MCP工具执行失败',
      error: error instanceof Error ? error.message : String(error),
    };
  }
});

/**
 * 获取可用的MCP提示模板
 */
router.get('/prompt-templates', async (ctx: ParameterizedContext) => {
  try {
    // MCP SDK不提供getPromptTemplates方法
    // 我们手动创建一个固定的模板列表
    const templates = [
      {
        name: "element-plus-component-generation",
        description: "用于生成Element Plus组件的提示模板",
        variables: [
          { name: "description", description: "详细描述组件的功能和需求", required: true },
          { name: "componentType", description: "组件的类型（如表格、表单等）", required: false },
          { name: "stylePreference", description: "组件的样式偏好", required: false },
          { name: "featuresStr", description: "组件必须实现的功能列表，用逗号分隔", required: false }
        ]
      }
    ];
    
    ctx.body = {
      templates
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      message: '获取提示模板失败',
      error: error instanceof Error ? error.message : String(error),
    };
  }
});

/**
 * 使用提示模板生成组件
 */
router.post('/use-prompt-template', async (ctx: ParameterizedContext) => {
  try {
    const { templateName, variables, llmConfig } = (ctx.request as any).body;
    
    // 验证必要的输入参数
    if (!templateName || !variables) {
      ctx.status = 400;
      ctx.body = {
        message: '缺少必要的templateName或variables参数',
      };
      return;
    }
    
    // 由于MCP SDK不提供getPromptTemplates方法
    // 直接调用MCP的prompt API
    let promptText = "";
    
    // 根据模板名称构建提示文本
    if (templateName === "element-plus-component-generation") {
      const { description, componentType, stylePreference, featuresStr } = variables;
      
      promptText = `你是一个专业的Vue3和Element Plus组件开发专家。请根据以下需求生成一个完整的Vue3组件：\n\n需求: ${description}`;
      
      if (componentType) {
        promptText += `\n\n组件类型: ${componentType}`;
      }
      
      if (stylePreference) {
        promptText += `\n\n样式偏好: ${stylePreference}`;
      }
      
      if (featuresStr) {
        const features = featuresStr.split(',').map(f => f.trim()).filter(f => f);
        if (features.length > 0) {
          promptText += `\n\n必需功能:\n`;
          for (const feature of features) {
            promptText += `- ${feature}\n`;
          }
        }
      }
      
      promptText += `\n\n请使用Element Plus组件库，生成完整的Vue SFC组件代码，包括<template>、<script setup>和<style>部分。\n组件应该遵安Vue3的最佳实践，使用组合式API，并且确保代码简洁、高效且易于理解。\n\n请确保:\n1. 导入所有必需的Element Plus组件\n2. 正确处理组件的props和事件\n3. 添加必要的注释和类型定义\n4. 代码应该是完整的、可运行的`;
    } else {
      ctx.status = 404;
      ctx.body = {
        message: `未找到名为${templateName}的提示模板`,
      };
      return;
    }
    
    // 使用生成的提示文本调用组件生成服务
    const result = await mcpAdapter.generateComponentFromMCP({
      description: promptText,
      llmConfig: llmConfig as Partial<LLMConfig>
    });
    
    ctx.body = result;
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      message: '使用提示模板失败',
      error: error instanceof Error ? error.message : String(error),
    };
  }
});

export default router;
