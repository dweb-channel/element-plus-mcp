import { describe, it, expect } from 'vitest';
import { buildHtml } from '../../src/routers/preview';


// 测试用的组件代码示例
const sampleComponent = `<template>
  <div>
    <el-input
      v-model="searchText"
      placeholder="请输入搜索内容"
      clearable
      @input="handleSearch"
    >
      <template #prefix>
        <el-icon><search /></el-icon>
      </template>
    </el-input>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { Search } from '@element-plus/icons-vue';

const searchText = ref('');
const handleSearch = () => {
  console.log('搜索:', searchText.value);
};
</script>`;


describe('buildHtml 函数测试', () => {
  it('应该生成包含模板内容的HTML', async () => {
    
    const html = buildHtml(sampleComponent);
    console.log('html=>',html)
    // // 验证HTML包含必要的结构
    // expect(html).toContain('<!DOCTYPE html>');
    // expect(html).toContain('<html');
    // expect(html).toContain('<body>');
    // expect(html).toContain('<div id="app"></div>');
    
    // // 验证Vue和Element Plus相关导入
    // expect(html).toContain('import { createApp');
    // expect(html).toContain('import ElementPlus');
    // expect(html).toContain('import * as ElementPlusIconsVue');
    
    // // 验证模板内容被正确提取
    // expect(html).toContain('el-input');
    // expect(html).toContain('v-model="searchText"');
    // expect(html).toContain('template #prefix');
    
    // // 验证包含了Element Plus相关初始化
    // expect(html).toContain('app.use(ElementPlus)');
  });
})
