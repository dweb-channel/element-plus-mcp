# element-plus-mcp
element-plush mcp server


## 配置

.env

```bash
DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions
DEEPSEEK_API_KEY=
```

## 🧩 MCP Server 实现概览

### 1. 🎯 优化 LLM API 用量
批量请求与缓存策略：使用 LRU 缓存组件描述、补全结果，避免重复调用。

Prompt 精简与上下文控制：仅传递必要上下文（如 props 类型、组件结构）。

并发控制：使用任务队列控制并发，防止 token 超限或速率限制。

### 2. 🔍 LLM 组件筛选
组件解析：扫描 Element Plus 的组件库。

提取：组件名、Props 类型、支持的插槽（slots）。

LLM 过滤：根据输入需求（如“选择组件用于上传头像”），生成 Prompt 让 LLM 选择适配组件。

结果结构：

```json
{
  "component": "ElUpload",
  "reason": "支持上传，包含头像预览和文件选择控制"
}
```


### 3. 🖼️ 独立 Code Preview 服务

服务目标：渲染 LLM 生成的 Vue 组件，提供 iframe 或沙盒 iframe 预览。

实现方式：

使用 Vite + Vue 构建预览容器

接收 SFC 内容并动态渲染

提供 POST API /preview 传入组件源码，返回 iframe 地址或 HTML

### 基本使用

#### 生成Element Plus组件

```bash
# 发送请求生成组件
curl -X POST http://localhost:3000/api/mcp/generate \
  -H "Content-Type: application/json" \
  -d '{"userPrompt": "创建一个带搜索功能的表格组件"}'
```

#### 配置使用不同的大模型

```bash
# 使用OpenAI的GPT-4模型
curl -X POST http://localhost:3000/api/mcp/generate \
  -H "Content-Type: application/json" \
  -d '{
    "userPrompt": "创建一个日期选择器组件",
    "llmConfig": {
      "modelType": "openai",
      "modelName": "gpt-4", 
      "temperature": 0.8
    }
  }'
```

#### 获取支持的模型列表

```bash
curl -X GET http://localhost:3000/api/mcp/models
```

### MCP协议使用 (Model Context Protocol)

#### 1. 通过HTTP API使用MCP

##### 调用MCP工具生成组件

```javascript
const response = await fetch('/api/mcp-protocol/mcp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'mcp/callTool',
    params: {
      name: 'generate-component',
      args: {
        description: '创建一个带搜索和分页的表格组件',
        componentType: '表格',
        stylePreference: '现代简约风格'
      }
    },
    id: 1
  })
});

const result = await response.json();
console.log(result.result.content[0].text);
```

##### 使用资源API获取组件信息

```javascript
const response = await fetch('/api/mcp-protocol/mcp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'mcp/readResource',
    params: {
      uri: '/element-plus/components/ElButton'
    },
    id: 1
  })
});

const result = await response.json();
console.log(result.result.contents[0].text);
```

#### 2. 使用SSE连接（流式响应）

```javascript
// 建立SSE连接
const eventSource = new EventSource('/api/mcp-protocol/sse');

// 接收消息
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('收到MCP消息:', data);
};

// 关闭连接
function closeConnection() {
  eventSource.close();
}
```

#### 3. 使用提示模板

```javascript
// 通过模板生成组件
const response = await fetch('/api/mcp-protocol/use-prompt-template', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    templateName: 'element-plus-component-generation',
    variables: {
      description: '创建一个用户管理表单',
      componentType: '表单',
      featuresStr: '表单验证,自适应布局,暗色主题支持'
    }
  })
});

const result = await response.json();
console.log(result);
```

### 环境配置

项目支持通过`.env`文件配置各种大模型的API密钥：

```
# DeepSeek（默认模型）
DEEPSEEK_API_URL=https://api.deepseek.com
DEEPSEEK_API_KEY=your_deepseek_key

# OpenAI
OPENAI_API_URL=https://api.openai.com/v1/chat/completions
OPENAI_API_KEY=your_openai_key

# Anthropic
ANTHROPIC_API_URL=https://api.anthropic.com/v1/messages
ANTHROPIC_API_KEY=your_anthropic_key

# Google Gemini
GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent
GEMINI_API_KEY=your_gemini_key
```

### 集成到前端项目

如果要在前端项目中集成本服务，可以通过以下方式：

```typescript
import { createClient } from '@modelcontextprotocol/sdk/client/mcp.js';

// 创建MCP客户端
const client = createClient('http://localhost:3000/api/mcp-protocol/mcp');

// 调用MCP工具
async function generateComponent(description) {
  const result = await client.callTool('generate-component', {
    description,
    componentType: '表格'
  });
  
  return result;
}
```
