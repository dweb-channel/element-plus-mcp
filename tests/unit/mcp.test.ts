import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createServer } from '../../src/app';

describe('MCP API', () => {
  it('should call generate-component tool and return valid response', async () => {
    const app = createServer().callback();
    
    const response = await request(app)
      .post('/api/mcp-protocol/mcp')
      .send({
        jsonrpc: "2.0",
        method: "mcp/callTool",
        params: {
          name: "generate-component",
          args: {
            description: '一个用于上传头像的组件',
            componentType: '表单项',
            stylePreference: '圆形按钮样式',
            featuresRequired: ['文件选择', '图片预览'],
          }
        },
        id: 1
      });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('result');
    expect(response.body.result).toHaveProperty('content');
    
    const content = response.body.result.content[0];
    expect(content.type).toBe('text');
    
    const parsed = JSON.parse(content.text);
    expect(parsed).toHaveProperty('componentName');
    expect(parsed).toHaveProperty('code');
    expect(parsed).toHaveProperty('previewUrl');
    expect(parsed).toHaveProperty('explanation');
  });
},300000);