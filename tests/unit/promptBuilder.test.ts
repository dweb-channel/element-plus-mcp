import { buildPrompt } from '../../src/utils/promptBuilder';
import { expect,describe,it } from 'vitest';

describe('buildPrompt', () => {
  it('should generate a prompt string with given user input', () => {
    const prompt = buildPrompt('我要一个上传组件');
    expect(prompt).toContain('用户需求：我要一个上传组件');
    expect(prompt).toContain('ElUpload');
  });
});