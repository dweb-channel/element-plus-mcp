import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * MCP 内容类型定义
 */
export type McpContent =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mimeType: string }
  | { type: "audio"; data: string; mimeType: string }
  | {
      type: "resource";
      resource:
        | { uri: string; text: string; mimeType?: string }
        | { uri: string; blob: string; mimeType?: string };
    };

/**
 * MCP 工具执行结果
 */
export interface McpToolResult {
  [key: string]: unknown;
  content: McpContent[];
  isError?: boolean;
}

/**
 * MCP 工具基类
 * 提供统一的工具注册和执行接口
 */
export abstract class BaseTool {
  /** 工具名称 */
  abstract name: string;

  /** 工具描述 */
  abstract description: string;

  /** 参数 Schema（Zod 验证） */
  abstract schema: z.ZodObject<any>;

  /**
   * 注册工具到 MCP 服务器
   * @param server MCP 服务器实例
   */
  register(server: McpServer): void {
    server.tool(
      this.name,
      this.description,
      this.schema.shape,
      this.execute.bind(this)
    );
  }

  /**
   * 执行工具逻辑
   * @param args 工具参数（经过 Zod 验证）
   * @returns 工具执行结果
   */
  abstract execute(args: z.infer<typeof this.schema>): Promise<McpToolResult>;
}
