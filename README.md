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

