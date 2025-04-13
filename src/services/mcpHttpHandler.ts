import { IncomingMessage, ServerResponse } from 'http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createMCPServer } from './mcpService';

/**
 * MCP HTTP处理器
 * 用于处理MCP协议的HTTP请求
 */
export class MCPHttpHandler {
  private server: McpServer;
  private headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };

  constructor(server?: McpServer) {
    this.server = server || createMCPServer();
  }

  /**
   * 处理HTTP请求
   * @param req HTTP请求
   * @param res HTTP响应
   */
  public async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // 处理OPTIONS请求（CORS预检）
    if (req.method === 'OPTIONS') {
      this.setHeaders(res);
      res.statusCode = 204;
      res.end();
      return;
    }

    // 解析请求路径
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const path = url.pathname;

    // 设置CORS头
    this.setHeaders(res);

    try {
      // 处理MCP协议请求
      if (path.startsWith('/api/mcp-protocol/mcp')) {
        await this.handleMCPRequest(req, res);
        return;
      }

      // 404 - 未找到路由
      res.statusCode = 404;
      res.end(JSON.stringify({ error: '未找到请求的路径' }));
    } catch (error) {
      console.error('MCP处理请求出错:', error);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: '处理请求时发生错误' }));
    }
  }

  /**
   * 处理MCP协议请求
   * 根据JSON-RPC标准处理MCP请求
   */
  private async handleMCPRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // 设置JSON内容类型
    res.setHeader('Content-Type', 'application/json');

    // 读取请求体
    const body = await this.readBody(req);
    let jsonBody;

    try {
      jsonBody = JSON.parse(body);
    } catch (e) {
      res.statusCode = 400;
      res.end(JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32700, message: '无效的JSON' },
        id: null
      }));
      return;
    }

    // 处理批量请求
    if (Array.isArray(jsonBody)) {
      const responses = await Promise.all(
        jsonBody.map(request => this.processSingleRequest(request))
      );
      res.end(JSON.stringify(responses));
      return;
    }

    // 处理单个请求
    const response = await this.processSingleRequest(jsonBody);
    res.end(JSON.stringify(response));
  }

  /**
   * 处理单个MCP请求
   */
  private async processSingleRequest(request: any): Promise<any> {
    // 验证JSON-RPC格式
    if (!request.jsonrpc || request.jsonrpc !== '2.0' || !request.method) {
      return {
        jsonrpc: '2.0',
        error: { code: -32600, message: '无效的请求' },
        id: request.id || null
      };
    }

    try {
      // 这里我们应该调用MCP服务器处理请求
      // 但由于MCP SDK不直接暴露这样的API，我们需要使用自定义逻辑

      // 根据方法名分派请求
      let result;
      switch (request.method) {
        case 'mcp/listResources':
          result = await this.handleListResources(request.params);
          break;
        case 'mcp/readResource':
          result = await this.handleReadResource(request.params);
          break;
        case 'mcp/callTool':
          result = await this.handleCallTool(request.params);
          break;
        case 'mcp/getPrompt':
          result = await this.handleGetPrompt(request.params);
          break;
        default:
          return {
            jsonrpc: '2.0',
            error: { code: -32601, message: `方法 ${request.method} 不存在` },
            id: request.id
          };
      }

      return {
        jsonrpc: '2.0',
        result,
        id: request.id
      };
    } catch (error) {
      console.error('处理MCP请求错误:', error);
      return {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: '内部错误',
          data: error instanceof Error ? error.message : String(error)
        },
        id: request.id
      };
    }
  }

  /**
   * 处理listResources请求
   */
  private async handleListResources(params: any): Promise<any> {
    // 返回手动定义的资源列表
    return {
      resources: [
        {
          name: 'element-plus-components',
          uri: '/element-plus/components',
          description: 'Element Plus UI组件库的组件'
        }
      ]
    };
  }

  /**
   * 处理readResource请求
   */
  private async handleReadResource(params: any): Promise<any> {
    const { uri } = params;
    if (!uri) {
      throw new Error('缺少必要的uri参数');
    }

    // 解析URI
    const url = new URL(uri, 'http://localhost');
    const path = url.pathname;

    // 根据路径返回不同资源
    if (path.startsWith('/element-plus/components')) {
      const componentId = path.split('/').pop();
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
            uri: `/element-plus/components/${componentId || 'example'}`,
            text: JSON.stringify({
              name: componentId || 'ElExample',
              description: '这是一个示例组件',
              props: [
                { name: 'value', type: 'string', description: '组件值' }
              ]
            }, null, 2),
            mimeType: 'application/json'
          }
        ]
      };
    } catch (error) {
      throw new Error(`获取组件资源失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 处理callTool请求
   */
  private async handleCallTool(params: any): Promise<any> {
    const { name, args } = params;
    if (!name) {
      throw new Error('缺少必要的工具名称');
    }

    // 根据工具名称调用不同的工具
    if (name === 'generate-component') {
      return this.callGenerateComponentTool(args);
    }

    throw new Error(`未找到工具: ${name}`);
  }

  /**
   * 调用生成组件工具
   */
  private async callGenerateComponentTool(args: any): Promise<any> {
    try {
      // 这里应该调用你的组件生成服务
      // 但这里只是演示API，返回一个模拟结果
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              componentName: 'ExampleComponent',
              code: '<template>\n  <div>示例组件</div>\n</template>',
              explanation: '这是一个示例组件'
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`调用生成组件工具失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 处理getPrompt请求
   */
  private async handleGetPrompt(params: any): Promise<any> {
    const { name, args } = params;
    if (!name) {
      throw new Error('缺少必要的提示模板名称');
    }

    // 根据提示模板名称返回不同的提示
    if (name === 'element-plus-component-generation') {
      return this.getElementPlusComponentPrompt(args);
    }

    throw new Error(`未找到提示模板: ${name}`);
  }

  /**
   * 获取Element Plus组件生成提示
   */
  private async getElementPlusComponentPrompt(args: any): Promise<any> {
    try {
      const { description, componentType, stylePreference, featuresStr } = args || {};
      
      let promptText = `你是一个专业的Vue3和Element Plus组件开发专家。请根据以下需求生成一个完整的Vue3组件：\n\n需求: ${description || '创建一个组件'}`;
      
      if (componentType) {
        promptText += `\n\n组件类型: ${componentType}`;
      }
      
      if (stylePreference) {
        promptText += `\n\n样式偏好: ${stylePreference}`;
      }
      
      if (featuresStr) {
        const features = featuresStr.split(',').map((f: string) => f.trim()).filter((f: string) => f);
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
            role: 'user',
            content: {
              type: 'text',
              text: promptText
            }
          }
        ],
        defaultModel: 'gpt-4'
      };
    } catch (error) {
      throw new Error(`获取提示模板失败: ${error instanceof Error ? error.message : String(error)}`);
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

  /**
   * 读取请求体
   */
  private readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      req.on('error', (err) => reject(err));
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
  }
}

// 创建HTTP处理器实例
export const mcpHttpHandler = new MCPHttpHandler();
