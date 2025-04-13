import Router from "koa-router";
import type { Context } from "koa";
import { PreviewService } from "../services/previewService";

const router = new Router();
const previewService = PreviewService.instance

router.get("/get/:id", async (ctx: Context) => {
  const { id } = ctx.params;
  const code = previewService.getCodeById(id);

  if (!code) {
    ctx.status = 404;
    ctx.body = `id: ${id} Preview not found`;
    return;
  }

  ctx.type = "html";
  ctx.body = buildHtml(code);
});

/**
 * 沙箱环境路由
 * 用于呈现组件的安全环境
 */
router.get("/sandbox", async (ctx: Context) => {
  const { id } = ctx.query;
  
  if (!id || typeof id !== 'string') {
    ctx.status = 400;
    ctx.body = '缺少预览ID参数';
    return;
  }
  
  ctx.type = "html";
  ctx.body = buildSandboxHtml(id);
});

/**
 * 生成组件预览HTML页面
 * @param code Vue组件代码
 * @returns 包含iframe的HTML页面
 */
export function buildHtml(code: string): string {
  // 将组件代码进行 base64 编码以便存储和传输
  const encodedComponent = Buffer.from(code).toString('base64');
  
  // 生成页面 ID
  const previewId = `preview-${Date.now()}`;
  
  // 创建一个包含 iframe 的页面
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Element Plus 组件预览</title>
  <style>
    html, body { 
      width: 100%; 
      height: 100%; 
      margin: 0; 
      padding: 0; 
      overflow: hidden;
    }
    .container {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .header {
      height: 30px;
      background-color: #409eff;
      color: white;
      display: flex;
      align-items: center;
      padding: 0 10px;
      font-size: 14px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    #sandbox-frame { 
      flex: 1;
      width: 100%; 
      border: none; 
      margin: 0;
      padding: 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">Element Plus 组件预览</div>
    <iframe id="sandbox-frame" src="/api/preview/sandbox?id=${previewId}" frameborder="0"></iframe>
  </div>
  
  <script>
    // 将组件数据存储到 localStorage
    localStorage.setItem('${previewId}', '${encodedComponent}');
    
    // 清理函数 - 5分钟后自动清除缓存
    setTimeout(() => {
      localStorage.removeItem('${previewId}');
    }, 5 * 60 * 1000);
    
    // 监听 iframe 消息
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'iframe-height') {
        document.getElementById('sandbox-frame').style.height = event.data.height + 'px';
      }
    });
  </script>
</body>
</html>
  `;
}

/**
 * 生成沙箱环境HTML
 * @param previewId 预览ID
 * @returns 沙箱环境HTML
 */
export function buildSandboxHtml(previewId: string): string {
  // 使用模板字符串自定义拼接HTML
  // 这里所有的JavaScript都是作为字符串插入到HTML中
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Element Plus 组件沙箱</title>
  <link rel="stylesheet" href="https://unpkg.com/element-plus/dist/index.css">
  <script type="importmap">
    {
      "imports": {
        "vue": "https://unpkg.com/vue@3/dist/vue.esm-browser.js",
        "element-plus": "https://unpkg.com/element-plus/dist/index.full.mjs"
      }
    }
  </script>
  <style>
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      padding: 16px;
    }
    #app {
      border-radius: 4px;
      overflow: hidden;
    }
    .el-button {
      margin-right: 8px;
      margin-bottom: 8px;
    }
    .component-container {
      padding: 16px;
      background-color: #f5f7fa;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div id="app" class="component-container"></div>
  
  <script type="module">
    import { createApp, defineComponent, ref, reactive, computed, watch, onMounted } from 'vue';
    import ElementPlus from 'element-plus';
    import * as ElementPlusIconsVue from 'https://unpkg.com/@element-plus/icons-vue';
    
    // 从 localStorage 获取组件代码
    const encodedComponent = localStorage.getItem('${previewId}');
    if (!encodedComponent) {
      document.body.innerHTML = '<h3>组件预览已过期或不存在</h3>';
    } else {
      // 解码组件代码
      const componentCode = atob(encodedComponent);
      
      // 解析组件
      let template = '';
      let script = '';
      
      // 解析 template 部分
      const templateMatch = componentCode.match(/<template>([\s\S]*?)<\/template>/i);
      if (templateMatch && templateMatch[1]) {
        template = templateMatch[1].trim();
      } else {
        // 如果没有template标签，将整个代码作为模板
        template = componentCode;
      }
      
      // 解析 script 部分
      const scriptMatch = componentCode.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
      if (scriptMatch && scriptMatch[1]) {
        script = scriptMatch[1].trim();
      }
      
      // 创建iframe高度调整函数
      function updateIframeHeight() {
        const height = document.body.scrollHeight;
        window.parent.postMessage({ type: 'iframe-height', height }, '*');
      }
      
      // 当DOM变化时更新iframe高度
      const observer = new MutationObserver(updateIframeHeight);
      observer.observe(document.body, { 
        attributes: true, 
        childList: true, 
        subtree: true 
      });
      
      // 创建应用
      const app = createApp(Component);
      
      // 注册 Element Plus
      app.use(ElementPlus);
      
      // 注册所有 Element Plus 图标
      for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
        app.component(key, component);
      }
      
      // 挂载应用
      app.mount('#app');
      
      // 页面加载完成后更新iframe高度
      window.onload = updateIframeHeight;
    }
  </script>
</body>
</html>
  `;
}

export default router;
