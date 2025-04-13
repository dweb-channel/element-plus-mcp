export class PreviewService {
  static instance = new PreviewService();
  private codeStore: Map<string, string>;
  private currentId: number;

  private constructor() {
    this.codeStore = new Map();
    this.currentId = 0;
    this.codeStore.set(
      "0",
      `<template>
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
</script>`
    );
  }

  public async buildPreview(code: string): Promise<string> {
    const id = this.generateId();
    this.storeCode(id, code);
    return `http://localhost:3000/api/preview/get/${id}`;
  }

  private generateId(): string {
    return (this.currentId++).toString();
  }

  private storeCode(id: string, code: string): void {
    this.codeStore.set(id, code);
  }

  public getCodeById(id: string): string | undefined {
    console.log("codeStore", this.codeStore.size);
    return this.codeStore.get(id);
  }
}
