/**
 * 缓存服务
 * 用于缓存组件生成结果，提高响应速度，减少 LLM API 调用
 */

interface CacheEntry<T> {
  value: T;
  expireAt: number;
}

export class CacheService<T = any> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private maxSize: number;
  private ttl: number; // Time to live in milliseconds

  constructor(maxSize: number = 100, ttl: number = 3600000) {
    // 默认缓存100个条目，1小时过期
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  /**
   * 设置缓存
   */
  set(key: string, value: T): void {
    // 如果缓存已满，删除最早的条目
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      expireAt: Date.now() + this.ttl,
    });
  }

  /**
   * 获取缓存
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // 检查是否过期
    if (Date.now() > entry.expireAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 清理过期缓存
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expireAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 生成缓存键
   */
  static generateKey(params: Record<string, any>): string {
    // 将参数对象转换为排序后的字符串，确保相同参数生成相同的key
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {} as Record<string, any>);

    return JSON.stringify(sortedParams);
  }
}

// 创建全局缓存实例
export const componentCache = new CacheService<{
  componentName: string;
  code: string;
  previewUrl: string;
  explanation: string;
}>(100, 3600000); // 缓存100个组件，1小时过期

// 定期清理过期缓存（每10分钟）
setInterval(() => {
  componentCache.cleanup();
}, 600000);
