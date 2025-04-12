import Router from 'koa-router';
import type { ParameterizedContext } from 'koa';
import { generateComponent } from '../services/componentFilter';
import { fixCode } from '../services/codeFixer';
import { buildPreview } from '../services/previewService';

const router = new Router();

router.post('/generate', async (ctx: ParameterizedContext) => {
  // 使用类型断言来处理 body 属性
  const { userPrompt } = (ctx.request as any).body;

  try {
    const { component, reason, rawCode } = await generateComponent(userPrompt);
    const fixedCode = fixCode(rawCode);
    const previewUrl = await buildPreview(fixedCode);

    ctx.body = {
      component,
      reason,
      fixedCode,
      previewUrl,
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      message: 'MCP generation failed',
      error: error.message,
    };
  }
});

export default router;