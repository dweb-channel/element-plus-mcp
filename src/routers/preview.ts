import Router from "koa-router";
import type { Context } from "koa";
import { PreviewService } from "../services/previewService";

const router = new Router();
const previewService = new PreviewService();

router.get("/preview/:id", async (ctx: Context) => {
  const { id } = ctx.params;
  const code = previewService.getCodeById(id);

  if (!code) {
    ctx.status = 404;
    ctx.body = "Preview not found";
    return;
  }

  ctx.type = "html";
  ctx.body = buildHtml(code);
});

function buildHtml(code: string): string {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Component Preview</title>
    <script type="module">
      import { createApp } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
      import ElementPlus from 'https://unpkg.com/element-plus/dist/index.full.mjs';
      import 'https://unpkg.com/element-plus/dist/index.css';

      const App = {
        template: \`${code}\`
      };

      createApp(App).use(ElementPlus).mount('#app');
    </script>
  </head>
  <body>
    <div id="app"></div>
  </body>
  </html>
  `;
}

export default router;
