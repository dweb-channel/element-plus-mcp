import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import Router from 'koa-router';
import mcpRoutes from './routers/mcp';

export function createServer() {
  const app = new Koa();
  const router = new Router();

  app.use(bodyParser());
  
  app.use(async (ctx, next) => {
    try {
      await next();
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = {
        message: err.message || 'Internal Server Error',
      };
      ctx.app.emit('error', err, ctx);
    }
  });

  router.use('/api/mcp', mcpRoutes.routes(), mcpRoutes.allowedMethods());

  app.use(router.routes()).use(router.allowedMethods());

  app.on('error', (err, ctx) => {
    console.error('Server error:', err);
  });

  return app;
}