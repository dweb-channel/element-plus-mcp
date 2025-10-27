import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import path from "path";
import fs from "fs";
import { ServerResponse } from "http";
import { GenerateComponentTool } from "../tools/generate-component-tool.js";

/**
 * 初始化MCP服务器
 * 创建一个MCP服务器实例，用于处理模型上下文协议
 */
export function createMCPServer() {
  // 创建MCP服务器实例
  const server = new McpServer({
    name: "element-plus-mcp",
    version: "1.0.0",
  });

  // 使用 BaseTool 模式注册工具
  new GenerateComponentTool().register(server);

  // 注册Element Plus组件资源
  registerElementPlusComponentsResource(server);

  // 注册自定义提示模板
  registerCustomPrompts(server);

  return server;
}

/**
 * 创建SSE传输层
 * 用于HTTP流式通信
 */
export function createSSETransport(endpoint: string, res: ServerResponse) {
  return new SSEServerTransport(endpoint, res);
}

/**
 * 注册Element Plus组件资源
 * 提供Element Plus组件库的相关信息作为上下文资源
 */
function registerElementPlusComponentsResource(server: McpServer) {
  // 创建Element Plus组件资源模板
  const componentsResource = new ResourceTemplate(
    "/element-plus/components/{id}", // URI模板
    {
      list: async () => {
        // 实现获取组件列表的逻辑
        try {
          // 加载组件数据（示例：从JSON文件加载）
          const componentsPath = path.join(
            process.cwd(),
            "data",
            "element-plus-components.json"
          );

          if (!fs.existsSync(componentsPath)) {
            console.warn(`组件数据文件不存在: ${componentsPath}`);
            return { resources: [] }; // 注意：这里应该是resources而不是items
          }

          const componentsData = JSON.parse(
            fs.readFileSync(componentsPath, "utf-8")
          );

          return {
            resources: componentsData.map((comp: any) => ({
              uri: `/element-plus/components/${comp.name}`,
              name: comp.name,
              displayName: comp.name,
              description: comp.description,
            })),
          };
        } catch (error) {
          console.error("加载组件数据失败:", error);
          return { resources: [] }; // 注意：这里应该是resources而不是items
        }
      },
    }
  );

  // 定义组件模式
  const componentSchema = z.object({
    name: z.string().describe("组件名称"),
    description: z.string().describe("组件描述"),
    category: z.string().describe("组件分类"),
    props: z
      .array(
        z.object({
          name: z.string().describe("属性名称"),
          type: z.string().describe("属性类型"),
          description: z.string().describe("属性描述"),
          default: z.string().optional().describe("默认值"),
          required: z.boolean().optional().describe("是否必需"),
        })
      )
      .describe("组件属性"),
    events: z
      .array(
        z.object({
          name: z.string().describe("事件名称"),
          description: z.string().describe("事件描述"),
          params: z
            .array(
              z.object({
                name: z.string().describe("参数名称"),
                type: z.string().describe("参数类型"),
                description: z.string().describe("参数描述"),
              })
            )
            .optional()
            .describe("事件参数"),
        })
      )
      .optional()
      .describe("组件事件"),
    slots: z
      .array(
        z.object({
          name: z.string().describe("插槽名称"),
          description: z.string().describe("插槽描述"),
        })
      )
      .optional()
      .describe("组件插槽"),
  });

  // 注册组件资源
  server.resource(
    "element-plus-components", // 资源名称
    componentsResource, // 资源模板
    {
      displayName: "Element Plus 组件",
      description: "Element Plus UI组件库的基本信息",
    }, // 元数据
    async (uri, variables) => {
      try {
        // 获取组件ID
        const id = variables.id;
        const componentsPath = path.join(
          process.cwd(),
          "data",
          "element-plus-components.json"
        );

        // 检查文件是否存在
        if (!fs.existsSync(componentsPath)) {
          console.warn(`组件数据文件不存在: ${componentsPath}`);
          return {
            contents: [
              {
                uri: uri.toString(),
                text: "组件数据不存在",
                mimeType: "text/plain",
              },
            ],
          };
        }

        const componentsData = JSON.parse(
          fs.readFileSync(componentsPath, "utf-8")
        );

        // 如果未指定具体组件，返回第一个作为示例
        if (!id) {
          const firstComponent = componentsData[0] || {
            name: "empty",
            description: "没有可用的组件数据",
          };
          return {
            contents: [
              {
                uri: uri.toString(),
                text: JSON.stringify(firstComponent, null, 2),
                mimeType: "application/json",
              },
            ],
          };
        }

        // 查找特定组件
        const component = componentsData.find((c: any) => c.name === id);

        if (!component) {
          return {
            contents: [
              {
                uri: uri.toString(),
                text: `未找到名为 ${id} 的组件`,
                mimeType: "text/plain",
              },
            ],
          };
        }

        // 返回组件内容
        return {
          contents: [
            {
              uri: uri.toString(),
              text: JSON.stringify(component, null, 2),
              mimeType: "application/json",
            },
          ],
        };
      } catch (error) {
        console.error("读取组件数据失败:", error);
        return {
          contents: [
            {
              uri: uri.toString(),
              text: `读取组件数据失败: ${
                error instanceof Error ? error.message : String(error)
              }`,
              mimeType: "text/plain",
            },
          ],
        };
      }
    }
  );
}

// 旧的 registerComponentGenerationTool 函数已删除
// 现在使用 GenerateComponentTool 类（BaseTool 模式）

/**
 * 注册自定义提示模板
 * 提供Element Plus组件生成的提示模板
 */
function registerCustomPrompts(server: McpServer) {
  // 使用prompt方法注册提示模板
  server.prompt(
    "element-plus-component-generation", // 模板名称
    "用于生成Element Plus组件的提示模板", // 描述
    // 定义模板参数类型
    {
      description: z.string().describe("详细描述组件的功能和需求"),
      componentType: z
        .string()
        .optional()
        .describe("组件的类型（如表格、表单等）"),
      stylePreference: z.string().optional().describe("组件的样式偏好"),
      // MCP的prompt只支持字符串类型参数，所以这里使用字符串，并在处理时进行解析
      featuresStr: z
        .string()
        .optional()
        .describe("组件必须实现的功能列表，用逗号分隔"),
    },
    // 提示模板生成函数
    async (
      { description, componentType, stylePreference, featuresStr },
      extra
    ) => {
      let promptText = `你是一个专业的Vue3和Element Plus组件开发专家。请根据以下需求生成一个完整的Vue3组件：\n\n需求: ${description}\n`;

      if (componentType) {
        promptText += `\n组件类型: ${componentType}\n`;
      }

      if (stylePreference) {
        promptText += `\n样式偏好: ${stylePreference}\n`;
      }

      if (featuresStr) {
        const features = featuresStr
          .split(",")
          .map((f) => f.trim())
          .filter((f) => f);
        if (features.length > 0) {
          promptText += `\n必需功能:\n`;
          for (const feature of features) {
            promptText += `- ${feature}\n`;
          }
        }
      }

      promptText += `\n请使用Element Plus组件库，生成完整的Vue SFC组件代码，包括<template>、<script setup>和<style>部分。
组件应该遵安Vue3的最佳实践，使用组合式API，并且确保代码简洁、高效且易于理解。\n\n请确保:\n1. 导入所有必需的Element Plus组件\n2. 正确处理组件的props和事件\n3. 添加必要的注释和类型定义\n4. 代码应该是完整的、可运行的`;

      // 按照MCP SDK要求，返回格式为包含messages数组的对象
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
        defaultModel: "gpt-4", // 建议的默认模型（可选）
      };
    }
  );
}
