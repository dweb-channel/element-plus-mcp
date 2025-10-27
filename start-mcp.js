#!/usr/bin/env node

/**
 * MCP 服务器 Stdio 启动脚本
 * 用于编辑器通过 Stdio 方式连接 MCP 服务器
 */

import { createMCPServer } from './src/services/mcpService.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

async function main() {
  try {
    // 创建 MCP 服务器实例
    const server = createMCPServer();
    
    // 创建 Stdio 传输层
    const transport = new StdioServerTransport();
    
    // 连接服务器和传输层
    await server.connect(transport);
    
    // 记录启动信息（会输出到编辑器的 MCP 日志中）
    console.error('✅ Element Plus MCP 服务器已启动 (Stdio 模式)');
    console.error('📦 支持的工具: generate-component');
    console.error('📚 支持的资源: element-plus-components');
    console.error('📝 支持的提示: element-plus-component-generation');
    
    // 处理进程退出信号
    process.on('SIGINT', () => {
      console.error('⏹️  MCP 服务器正在关闭...');
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.error('⏹️  MCP 服务器正在关闭...');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ MCP 服务器启动失败:', error);
    process.exit(1);
  }
}

main();
