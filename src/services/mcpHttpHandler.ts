import { IncomingMessage, ServerResponse } from "http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMCPServer } from "./mcpService";
import { generateComponent } from "./componentFilter";
import { fixCode } from "./codeFixer";
import { PreviewService } from "./previewService";

/**
 * MCP HTTP处理器
 * 用于处理MCP协议的HTTP请求
 */
export class MCPHttpHandler {
  private server: McpServer;
  private headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };

  constructor(server?: McpServer) {
    this.server = server || createMCPServer();
  }

  /**
   * 处理HTTP请求
   * @param req HTTP请求
   * @param res HTTP响应
   * @param body 可选的已解析请求体
   */
  public async handleRequest(
    req: IncomingMessage,
    res: ServerResponse,
    body?: any
  ): Promise<void> {
    // 处理OPTIONS请求（CORS预检）
    if (req.method === "OPTIONS") {
      this.setHeaders(res);
      res.statusCode = 204;
      res.end();
      return;
    }

    // 解析请求路径
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    const path = url.pathname;

    // 设置CORS头
    this.setHeaders(res);
    try {
      // 处理MCP协议请求
      if (path.startsWith("/api/mcp-protocol/mcp")) {
        await this.handleMCPRequest(res, body);
        return;
      }

      // 404 - 未找到路由
      res.statusCode = 404;
      res.end(JSON.stringify({ error: "未找到请求的路径" }));
    } catch (error) {
      console.error("MCP处理请求出错:", error);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: "处理请求时发生错误" }));
    }
  }

  /**
   * 处理MCP协议请求
   * 根据JSON-RPC标准处理MCP请求
   */
  private async handleMCPRequest(
    res: ServerResponse,
    body?: any
  ): Promise<void> {
    // 设置JSON内容类型
    res.setHeader("Content-Type", "application/json");

    let jsonBody;

    try {
      // 如果有已解析的body，优先使用它
      if (body) {
        jsonBody = body;
      } else {
        // 如果没有提供已解析的body，尝试使用JSON.parse直接解析
        // 注意：这个情况只会发生在非koa环境，或者没有使用bodyParser中间件的情况下
        console.error("警告：没有找到已解析的body数据，这可能是一个问题");
        jsonBody = { error: "没有请求体数据" };
      }

      // 处理批量请求
      if (Array.isArray(jsonBody)) {
        const responses = await Promise.all(
          jsonBody.map((request) => this.processSingleRequest(request))
        );
        res.end(JSON.stringify(responses));
        return;
      }

      // 处理单个请求
      const response = await this.processSingleRequest(jsonBody);
      res.statusCode = 200;
      res.end(JSON.stringify(response));
    } catch (error) {
      console.error("处理MCP请求错误:", error);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: "处理请求时发生错误" }));
    }
  }

  /**
   * 处理单个MCP请求
   */
  private async processSingleRequest(request: any): Promise<any> {
    // 验证JSON-RPC格式
    if (!request.jsonrpc || request.jsonrpc !== "2.0" || !request.method) {
      return {
        jsonrpc: "2.0",
        error: { code: -32600, message: "无效的请求" },
        id: request.id || null,
      };
    }
    // 根据方法名分派请求
    let result;
    switch (request.method) {
      case "initialize":
        result = await this.handleInitialize(request.params);
        break;
      case "tools/list":
        result = await this.handleListTools(request.params);
        break;
      case "resources/list":
      case "mcp/listResources":
        result = await this.handleListResources(request.params);
        break;
      case "resources/read":
      case "mcp/readResource":
        result = await this.handleReadResource(request.params);
        break;
      case "tools/call":
      case "mcp/callTool":
        result = await this.handleCallTool(request.params);
        break;
      case "prompts/list":
        result = await this.handleListPrompts(request.params);
        break;
      case "prompts/get":
      case "mcp/getPrompt":
        result = await this.handleGetPrompt(request.params);
        break;
      default:
        return {
          jsonrpc: "2.0",
          error: { code: -32601, message: `方法 ${request.method} 不存在` },
          id: request.id,
        };
    }
    return {
      jsonrpc: "2.0",
      result,
      id: request.id,
    };
  }

  /**
   * 处理 initialize 请求（MCP 握手）
   */
  private async handleInitialize(params: any): Promise<any> {
    return {
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
      serverInfo: {
        name: "element-plus-mcp",
        version: "1.0.0",
      },
    };
  }

  /**
   * 处理 tools/list 请求
   */
  private async handleListTools(params: any): Promise<any> {
    return {
      tools: [
        {
          name: "generate-component",
          description: "根据描述生成 Element Plus 组件代码",
          inputSchema: {
            type: "object",
            properties: {
              description: {
                type: "string",
                description: "组件需求描述",
              },
              componentType: {
                type: "string",
                description: "组件类型（可选）",
              },
              llmConfig: {
                type: "object",
                description: "LLM 配置（可选）",
              },
            },
            required: ["description"],
          },
        },
      ],
    };
  }

  /**
   * 处理 prompts/list 请求
   */
  private async handleListPrompts(params: any): Promise<any> {
    return {
      prompts: [
        {
          name: "element-plus-component-generation",
          description: "用于生成 Element Plus 组件的提示模板",
          arguments: [
            {
              name: "description",
              description: "组件需求描述",
              required: true,
            },
            {
              name: "componentType",
              description: "组件类型",
              required: false,
            },
          ],
        },
      ],
    };
  }

  /**
   * 处理listResources请求
   */
  private async handleListResources(params: any): Promise<any> {
    // 返回手动定义的资源列表
    return {
      resources: [
        {
          name: "element-plus-components",
          uri: "/element-plus/components",
          description: "Element Plus UI组件库的组件",
        },
      ],
    };
  }

  /**
   * 处理readResource请求
   */
  private async handleReadResource(params: any): Promise<any> {
    const { uri } = params;
    if (!uri) {
      throw new Error("缺少必要的uri参数");
    }

    // 解析URI
    const url = new URL(uri, "http://localhost");
    const path = url.pathname;

    // 根据路径返回不同资源
    if (path.startsWith("/element-plus/components")) {
      const componentId = path.split("/").pop();
      return this.getComponentResource(componentId);
    }

    throw new Error(`未找到资源: ${uri}`);
  }

  /**
   * 获取组件资源
   */
  private async getComponentResource(componentId?: string): Promise<any> {
    try {
      // 这里可以实现从JSON文件或数据库读取组件数据
      // 简单起见，我们返回一个模拟数据
      return {
        contents: [
          {
            uri: `/element-plus/components/${componentId || "example"}`,
            text: JSON.stringify(
              {
                name: componentId || "ElExample",
                description: "这是一个示例组件",
                props: [
                  { name: "value", type: "string", description: "组件值" },
                ],
              },
              null,
              2
            ),
            mimeType: "application/json",
          },
        ],
      };
    } catch (error) {
      throw new Error(
        `获取组件资源失败: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * 处理callTool请求
   */
  private async handleCallTool(params: any): Promise<any> {
    const { name, arguments: args } = params;
    if (!name) {
      throw new Error("缺少必要的工具名称");
    }

    // 根据工具名称调用不同的工具
    if (name === "generate-component") {
      return this.callGenerateComponentTool(args);
    }

    throw new Error(`未找到工具: ${name}`);
  }

  /**
   * 调用生成组件工具
   */
  private async callGenerateComponentTool(args: any): Promise<any> {
    console.log("🔧 callGenerateComponentTool 被调用，原始args:", args);
    try {
      const { description, componentType, stylePreference, featuresRequired } =
        args || {};
      console.log("📋 解析后的参数:", {
        description,
        componentType,
        stylePreference,
        featuresRequired,
      });

      const promptParts = [
        description,
        componentType && `类型：${componentType}`,
        stylePreference && `风格：${stylePreference}`,
        featuresRequired?.length && `功能：${featuresRequired.join("，")}`,
      ].filter(Boolean);

      const prompt = promptParts.join("，");
      console.log("📝 构建的prompt:", prompt);

      const { component, reason, rawCode } = await generateComponent(prompt);
      const fixedCode = fixCode(rawCode);
      const previewUrl = await PreviewService.instance.buildPreview(fixedCode);
      console.log("previewUrl=>", previewUrl);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                componentName: component,
                code: fixedCode,
                explanation: reason,
                previewUrl,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      throw new Error(
        `调用生成组件工具失败: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * 处理getPrompt请求
   */
  private async handleGetPrompt(params: any): Promise<any> {
    const { name, arguments: args } = params;
    if (!name) {
      throw new Error("缺少必要的提示模板名称");
    }

    // 根据提示模板名称返回不同的提示
    if (name === "element-plus-component-generation") {
      return this.getElementPlusComponentPrompt(args);
    }

    throw new Error(`未找到提示模板: ${name}`);
  }

  /**
   * 获取Element Plus组件生成提示
   */
  private async getElementPlusComponentPrompt(args: any): Promise<any> {
    try {
      const { description, componentType, stylePreference, featuresStr } =
        args || {};

      let promptText = `你是一个专业的Vue3和Element Plus组件开发专家。请根据以下需求生成一个完整的Vue3组件：\n\n需求: ${
        description || "创建一个组件"
      }`;

      if (componentType) {
        promptText += `\n\n组件类型: ${componentType}`;
      }

      if (stylePreference) {
        promptText += `\n\n样式偏好: ${stylePreference}`;
      }

      if (featuresStr) {
        const features = featuresStr
          .split(",")
          .map((f: string) => f.trim())
          .filter((f: string) => f);
        if (features.length > 0) {
          promptText += `\n\n必需功能:\n`;
          for (const feature of features) {
            promptText += `- ${feature}\n`;
          }
        }
      }

      promptText += `\n\n请使用Element Plus组件库，生成完整的Vue SFC组件代码，包括<template>、<script setup>和<style>部分。
组件应该遵安Vue3的最佳实践，使用组合式API，并且确保代码简洁、高效且易于理解。\n\n请确保:
1. 导入所有必需的Element Plus组件
2. 正确处理组件的props和事件
3. 添加必要的注释和类型定义
4. 代码应该是完整的、可运行的`;

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: promptText,
            },
          },
        ],
        defaultModel: "gpt-4",
      };
    } catch (error) {
      throw new Error(
        `获取提示模板失败: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * 设置响应头
   */
  private setHeaders(res: ServerResponse): void {
    for (const [key, value] of Object.entries(this.headers)) {
      res.setHeader(key, value);
    }
  }
}

// 创建HTTP处理器实例
export const mcpHttpHandler = new MCPHttpHandler();
