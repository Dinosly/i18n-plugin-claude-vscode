#!/usr/bin/env node

import { Command } from 'commander'
import { extract } from './index'
import * as path from 'path'

const program = new Command()

program
  .name('i18n-extract')
  .description('提取源码中的中文并生成国际化字典')
  .version('1.0.0')

program
  .command('extract')
  .description('扫描源码并提取中文')
  .option('-s, --src <dir>', '源码目录', 'src')
  .option('-o, --out <dir>', '输出目录', 'locales')
  .option('-l, --locales <locales>', '语言列表（逗号分隔）', 'zh-CN,en-US')
  .option('-d, --default <locale>', '默认语言', 'zh-CN')
  .action(async (options) => {
    const srcDir = path.resolve(process.cwd(), options.src)
    const outDir = path.resolve(process.cwd(), options.out)
    const locales = options.locales.split(',').map((l: string) => l.trim())

    await extract({
      srcDir,
      outDir,
      locales,
      defaultLocale: options.default
    })
  })

program.parse()
