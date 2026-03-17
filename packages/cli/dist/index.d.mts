interface ExtractOptions {
    srcDir: string;
    outDir: string;
    locales: string[];
    defaultLocale?: string;
}
/**
 * 主提取函数
 */
declare function extract(options: ExtractOptions): Promise<void>;

export { type ExtractOptions, extract };
