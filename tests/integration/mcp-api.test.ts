import request from 'supertest';
import { expect, describe, it } from 'vitest';
import { createServer } from '../../src/app';
import dotenv from 'dotenv';

// 确保环境变量被加载
dotenv.config();

const app = createServer().callback();

describe('POST /api/mcp/generate', () => {
  it('should return component suggestion (mock)', async () => {
    const response = await request(app)
      .post('/api/mcp/generate')
      .send({ userPrompt: '我要一个上传组件' });
      if (response.error) {
        return console.log(response.error)
      }
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('component');
    console.log(response.body)
  },300000);
});