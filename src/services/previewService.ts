export class PreviewService {
  private codeStore: Map<string, string>;
  private currentId: number;

  constructor() {
    this.codeStore = new Map();
    this.currentId = 0;
  }

  public async buildPreview(code: string): Promise<string> {
    const id = this.generateId();
    this.storeCode(id, code);
    return `/preview/${id}`;
  }

  private generateId(): string {
    return (this.currentId++).toString();
  }

  private storeCode(id: string, code: string): void {
    this.codeStore.set(id, code);
  }

  public getCodeById(id: string): string | undefined {
    return this.codeStore.get(id);
  }
}