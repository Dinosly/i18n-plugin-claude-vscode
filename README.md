# 企业级前端全自动化 I18n 架构

这是一套完整的企业级前端国际化解决方案，采用"编译时自动化拦截 + 运行时多态适配"的核心思想，实现低侵入、无感化的国际化开发体验。

## 架构特点

- **零侵入开发**：无需手动包裹 `$t()` 函数，编译时自动转换
- **多框架支持**：统一支持 Vue 2/3 和 React 16+
- **多构建工具**：基于 unplugin，同时支持 Vite/Webpack/Rollup
- **智能提取**：CLI 工具自动扫描源码提取中文，增量合并字典
- **响应式更新**：语言切换时自动触发视图更新，无需刷新页面

## 项目结构

```
.
├── packages/
│   ├── core/          # 运行时核心（纯 JS 内核 + 框架适配层）
│   ├── cli/           # 静态扫描与字典生成工具
│   └── unplugin/      # 编译时 AST 转换插件
└── examples/
    ├── vue3-demo/     # Vue 3 示例项目
    └── react-demo/    # React 示例项目
```

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 构建所有包

```bash
pnpm build
```

### 3. 运行示例项目

**Vue 3 示例：**
```bash
cd examples/vue3-demo
pnpm dev
```

**React 示例：**
```bash
cd examples/react-demo
pnpm dev
```

### 4. 提取中文并生成字典

```bash
cd examples/vue3-demo  # 或 react-demo
pnpm extract
```

## 使用指南

### 在 Vue 3 项目中使用

1. **安装依赖**
```bash
pnpm add @i18n-plugin/core @i18n-plugin/unplugin
```

2. **配置 Vite**
```ts
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import I18nPlugin from '@i18n-plugin/unplugin/vite'

export default defineConfig({
  plugins: [vue(), I18nPlugin()]
})
```

3. **初始化 i18n**
```ts
// main.ts
import { createApp } from 'vue'
import { createVue3I18n } from '@i18n-plugin/core/vue3'

const i18n = createVue3I18n({
  locale: 'zh-CN',
  messages: {}
})

const app = createApp(App)
app.use(i18n)
app.mount('#app')
```

4. **直接编写中文代码**
```vue
<template>
  <div>
    <h1>欢迎使用</h1>
    <input placeholder="请输入用户名" />
  </div>
</template>
```

编译后自动转换为：
```vue
<template>
  <div>
    <h1>{{ $t('欢迎使用') }}</h1>
    <input :placeholder="$t('请输入用户名')" />
  </div>
</template>
```

### 在 React 项目中使用

1. **安装依赖**
```bash
pnpm add @i18n-plugin/core @i18n-plugin/unplugin
```

2. **配置 Vite**
```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import I18nPlugin from '@i18n-plugin/unplugin/vite'

export default defineConfig({
  plugins: [react(), I18nPlugin()]
})
```

3. **初始化 i18n**
```tsx
// main.tsx
import { createReactI18n } from '@i18n-plugin/core/react'

const i18n = createReactI18n({
  locale: 'zh-CN',
  messages: {}
})
```

4. **使用 Hook**
```tsx
import { useI18n } from '@i18n-plugin/core/react'

function App() {
  const { locale, t } = useI18n()

  return (
    <div>
      <h1>欢迎使用</h1>
      <input placeholder="请输入用户名" />
    </div>
  )
}
```

### 忽略特定文本

使用注释标记不需要翻译的文本：

```tsx
// 单行忽略
// i18n-ignore
const apiKey = "sk-1234567890"

// 块级忽略
/* i18n-ignore-next-line */
console.log("Debug info")
```

## CLI 工具

### 提取中文并生成字典

```bash
i18n-extract extract \
  --src src \
  --out locales \
  --locales zh-CN,en-US \
  --default zh-CN
```

参数说明：
- `--src`: 源码目录（默认：src）
- `--out`: 输出目录（默认：locales）
- `--locales`: 语言列表，逗号分隔（默认：zh-CN,en-US）
- `--default`: 默认语言（默认：zh-CN）

## 核心特性

### 1. 编译时自动转换

- **JS/TS/JSX/TSX**：自动注入 `$t` 函数，替换中文字符串
- **Vue SFC**：转换 template 中的文本节点和属性
- **模板字符串**：支持插值替换 `` `已选择 ${count} 项` `` → `$t('已选择 {0} 项', count)`

### 2. 运行时响应式

- **Vue 3**：利用 `ref` 响应式系统
- **Vue 2**：利用 `Vue.observable()`
- **React**：通过 `useState` 触发强制渲染

### 3. 增量字典管理

- 自动扫描源码提取中文
- 增量合并，保留已有翻译
- 支持多语言并行维护

## 技术栈

- **AST 解析**：@babel/parser, @vue/compiler-sfc
- **构建工具**：unplugin（统一支持 Vite/Webpack/Rollup）
- **包管理**：pnpm workspace
- **类型支持**：TypeScript

## 开发计划

- [x] Phase 1: 基础设施构建（Core + CLI）
- [x] Phase 2: 编译期自动化拦截（Unplugin）
- [x] Phase 3: 框架深度融合（Vue/React 适配）
- [ ] Phase 4: 高级特性（Getter 常量转换、富文本支持、按需懒加载）

## License

MIT
