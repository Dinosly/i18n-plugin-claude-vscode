import * as fs from 'fs'
import * as path from 'path'
import { glob } from 'glob'
import { extractFromJS, ExtractResult } from './extractJS'
import { extractFromVue } from './extractVue'

export interface ExtractOptions {
  srcDir: string
  outDir: string
  locales: string[]
  defaultLocale?: string
}

/**
 * 主提取函数
 */
export async function extract(options: ExtractOptions): Promise<void> {
  const { srcDir, outDir, locales, defaultLocale = 'zh-CN' } = options

  console.log(`[i18n-extract] Scanning directory: ${srcDir}`)

  // 扫描所有源文件
  const files = await glob('**/*.{js,jsx,ts,tsx,vue}', {
    cwd: srcDir,
    absolute: true,
    ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts']
  })

  console.log(`[i18n-extract] Found ${files.length} files`)

  // 提取所有中文
  const allResults: ExtractResult[] = []

  for (const file of files) {
    const ext = path.extname(file)
    let results: ExtractResult[] = []

    if (ext === '.vue') {
      results = extractFromVue(file)
    } else {
      results = extractFromJS(file)
    }

    allResults.push(...results)
  }

  console.log(`[i18n-extract] Extracted ${allResults.length} Chinese texts`)

  // 去重（按 key）
  const uniqueMap = new Map<string, ExtractResult>()
  allResults.forEach(result => {
    if (!uniqueMap.has(result.key)) {
      uniqueMap.set(result.key, result)
    }
  })

  console.log(`[i18n-extract] Unique keys: ${uniqueMap.size}`)

  // 生成字典文件
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true })
  }

  for (const locale of locales) {
    const filePath = path.join(outDir, `${locale}.json`)
    let existingDict: Record<string, string> = {}

    // 读取现有字典（增量合并）
    if (fs.existsSync(filePath)) {
      try {
        existingDict = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      } catch (error) {
        console.warn(`[Warning] Failed to parse existing ${locale}.json`)
      }
    }

    // 合并新词条
    const newDict: Record<string, string> = { ...existingDict }

    uniqueMap.forEach((result, key) => {
      if (!newDict[key]) {
        // 默认语言使用原文，其他语言留空待翻译
        newDict[key] = locale === defaultLocale ? result.text : ''
      }
    })

    // 写入文件
    fs.writeFileSync(filePath, JSON.stringify(newDict, null, 2), 'utf-8')
    console.log(`[i18n-extract] Generated: ${filePath}`)
  }

  console.log('[i18n-extract] Done!')
}
