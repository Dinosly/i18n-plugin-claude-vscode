# i18n-plugin 使用文档

## 1. 项目简介

i18n-plugin 是一套完整的企业级前端国际化解决方案，采用"编译时自动化拦截 + 运行时多态适配"的核心思想，实现低侵入、无感化的国际化开发体验。

### 核心特性

- **零侵入开发**：无需手动包裹 `$t()` 函数，编译时自动转换
- **多框架支持**：统一支持 Vue 2/3 和 React 16+
- **多构建工具**：基于 unplugin，同时支持 Vite/Webpack/Rollup
- **智能提取**：CLI 工具自动扫描源码提取中文，增量合并字典
- **响应式更新**：语言切换时自动触发视图更新，无需刷新页面

## 2. 安装与配置

### 2.1 基础安装

```bash
# 安装核心依赖
pnpm add @i18n-plugin/core @i18n-plugin/unplugin

# 安装 CLI 工具（可选，用于提取中文生成字典）
pnpm add -D @i18n-plugin/cli
```

### 2.2 构建工具配置

#### Vite 配置

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue' // 或 @vitejs/plugin-react
import I18nPlugin from '@i18n-plugin/unplugin/vite'

export default defineConfig({
  plugins: [
    vue(), // 或 react()
    I18nPlugin({
      // 可选配置
      include: ['src/**/*.{vue,js,jsx,ts,tsx}'],
      exclude: ['node_modules', 'dist'],
      // 自定义转换规则
      transformOptions: {
        // 是否转换模板字符串
        templateStrings: true,
        // 是否转换 JSX 文本
        jsxText: true
      }
    })
  ]
})
```

#### Webpack 配置

```js
// webpack.config.js
const { defineConfig } = require('webpack')
const I18nPlugin = require('@i18n-plugin/unplugin/webpack')

module.exports = defineConfig({
  plugins: [
    I18nPlugin({
      // 配置选项同 Vite
    })
  ]
})
```

#### Rollup 配置

```js
// rollup.config.js
import I18nPlugin from '@i18n-plugin/unplugin/rollup'

export default {
  plugins: [
    I18nPlugin({
      // 配置选项同 Vite
    })
  ]
}
```

## 3. 框架集成

### 3.1 Vue 3 集成

```ts
// main.ts
import { createApp } from 'vue'
import { createVue3I18n } from '@i18n-plugin/core/vue3'
import App from './App.vue'

// 初始化 i18n
const i18n = createVue3I18n({
  locale: 'zh-CN', // 默认语言
  fallbackLocale: 'en-US', // 回退语言
  messages: {
    // 初始语言包（可选）
    'zh-CN': {
      '欢迎使用': '欢迎使用',
      '请输入用户名': '请输入用户名'
    },
    'en-US': {
      '欢迎使用': 'Welcome',
      '请输入用户名': 'Please enter username'
    }
  }
})

const app = createApp(App)
app.use(i18n) // 注册到 Vue 应用
app.mount('#app')
```

在 Vue 组件中使用：

```vue
<template>
  <div>
    <!-- 自动转换文本节点 -->
    <h1>欢迎使用</h1>
    
    <!-- 自动转换属性 -->
    <input placeholder="请输入用户名" />
    
    <!-- 手动使用 $t 函数（支持插值） -->
    <p>{{ $t('已选择 {0} 项', count) }}</p>
    
    <!-- 语言切换 -->
    <button @click="switchLocale">切换语言</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from '@i18n-plugin/core/vue3'

const count = ref(5)
const { locale, setLocale } = useI18n()

function switchLocale() {
  setLocale(locale.value === 'zh-CN' ? 'en-US' : 'zh-CN')
}
</script>
```

### 3.2 Vue 2 集成

```js
// main.js
import Vue from 'vue'
import { createVue2I18n } from '@i18n-plugin/core/vue2'
import App from './App.vue'

// 初始化 i18n
const i18n = createVue2I18n({
  locale: 'zh-CN',
  fallbackLocale: 'en-US',
  messages: {
    // 初始语言包
  }
})

// 注册到 Vue 原型
Vue.use(i18n)

new Vue({
  render: h => h(App)
}).$mount('#app')
```

在 Vue 2 组件中使用：

```vue
<template>
  <div>
    <h1>欢迎使用</h1>
    <input placeholder="请输入用户名" />
    <p>{{ $t('已选择 {0} 项', count) }}</p>
    <button @click="switchLocale">切换语言</button>
  </div>
</template>

<script>
export default {
  data() {
    return {
      count: 5
    }
  },
  methods: {
    switchLocale() {
      const newLocale = this.$i18n.locale === 'zh-CN' ? 'en-US' : 'zh-CN'
      this.$i18n.setLocale(newLocale)
    }
  }
}
</script>
```

### 3.3 React 集成

```tsx
// main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { createReactI18n } from '@i18n-plugin/core/react'
import App from './App'

// 初始化 i18n
createReactI18n({
  locale: 'zh-CN',
  fallbackLocale: 'en-US',
  messages: {
    // 初始语言包
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

在 React 组件中使用：

```tsx
import { useI18n } from '@i18n-plugin/core/react'

function App() {
  const { locale, t, setLocale } = useI18n()
  const count = 5

  function switchLocale() {
    setLocale(locale === 'zh-CN' ? 'en-US' : 'zh-CN')
  }

  return (
    <div>
      {/* 自动转换文本节点 */}
      <h1>欢迎使用</h1>
      
      {/* 自动转换属性 */}
      <input placeholder="请输入用户名" />
      
      {/* 手动使用 t 函数（支持插值） */}
      <p>{t('已选择 {0} 项', count)}</p>
      
      {/* 语言切换 */}
      <button onClick={switchLocale}>切换语言</button>
    </div>
  )
}

export default App
```

## 4. 核心功能使用

### 4.1 自动转换

#### JS/TS 文件

```js
// 源码
const message = '欢迎使用 i18n-plugin'
console.log('当前语言:', 'zh-CN')

// 编译后
const message = $t('欢迎使用 i18n-plugin')
console.log($t('当前语言:'), 'zh-CN')
```

#### 模板字符串

```js
// 源码
const count = 5
const message = `已选择 ${count} 项`

// 编译后
const count = 5
const message = $t('已选择 {0} 项', count)
```

#### Vue 模板

```vue
<!-- 源码 -->
<template>
  <div>
    <h1>欢迎使用</h1>
    <input placeholder="请输入用户名" />
    <button @click="handleClick">提交</button>
  </div>
</template>

<!-- 编译后 -->
<template>
  <div>
    <h1>{{ $t('欢迎使用') }}</h1>
    <input :placeholder="$t('请输入用户名')" />
    <button @click="handleClick">{{ $t('提交') }}</button>
  </div>
</template>
```

#### React JSX

```tsx
// 源码
function App() {
  return (
    <div>
      <h1>欢迎使用</h1>
      <input placeholder="请输入用户名" />
      <button>提交</button>
    </div>
  )
}

// 编译后
function App() {
  const { t } = useI18n()
  return (
    <div>
      <h1>{t('欢迎使用')}</h1>
      <input placeholder={t('请输入用户名')} />
      <button>{t('提交')}</button>
    </div>
  )
}
```

### 4.2 忽略特定文本

使用注释标记不需要翻译的文本：

```js
// 单行忽略
// i18n-ignore
const apiKey = "sk-1234567890"

// 块级忽略
/* i18n-ignore-next-line */
console.log("Debug info")

// 多行忽略
/* i18n-ignore-start */
const debugMessages = [
  "调试信息 1",
  "调试信息 2"
]
/* i18n-ignore-end */
```

### 4.3 动态加载语言包

```ts
// Vue 3
import { useI18n } from '@i18n-plugin/core/vue3'

const { loadMessages } = useI18n()

// 动态加载语言包
async function loadLanguage(locale) {
  const messages = await import(`./locales/${locale}.json`)
  loadMessages(locale, messages.default)
}

// 调用
loadLanguage('en-US')

// React
import { useI18n } from '@i18n-plugin/core/react'

const { loadMessages } = useI18n()

// 动态加载语言包
async function loadLanguage(locale) {
  const messages = await import(`./locales/${locale}.json`)
  loadMessages(locale, messages.default)
}
```

## 5. CLI 工具使用

### 5.1 提取中文生成字典

```bash
# 基本用法
i18n-extract extract --src src --out locales

# 自定义语言列表
i18n-extract extract --src src --out locales --locales zh-CN,en-US,ja-JP

# 指定默认语言
i18n-extract extract --src src --out locales --default zh-CN
```

### 5.2 命令参数说明

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--src` | 源码目录 | `src` |
| `--out` | 输出目录 | `locales` |
| `--locales` | 语言列表，逗号分隔 | `zh-CN,en-US` |
| `--default` | 默认语言 | `zh-CN` |
| `--include` | 包含的文件模式 | `**/*.{vue,js,jsx,ts,tsx}` |
| `--exclude` | 排除的文件模式 | `node_modules,dist` |

### 5.3 增量更新

CLI 工具会自动检测已有的语言文件，并进行增量更新：
- 保留已有的翻译
- 添加新提取的中文
- 移除不再使用的键

## 6. 高级特性

### 6.1 自定义转换规则

在构建工具配置中，可以自定义转换规则：

```ts
I18nPlugin({
  transformOptions: {
    // 是否转换模板字符串
    templateStrings: true,
    // 是否转换 JSX 文本
    jsxText: true,
    // 是否转换 Vue 模板
    vueTemplate: true,
    // 是否转换属性
    attributes: true,
    // 自定义需要转换的属性列表
    attributeNames: ['placeholder', 'title', 'alt'],
    // 自定义转换函数
    customTransform: (node, context) => {
      // 自定义转换逻辑
      return node
    }
  }
})
```

### 6.2 多语言切换管理

可以创建一个语言切换组件：

```vue
<!-- LanguageSwitcher.vue -->
<template>
  <div class="language-switcher">
    <button 
      v-for="lang in languages" 
      :key="lang.code"
      :class="{ active: locale === lang.code }"
      @click="setLocale(lang.code)"
    >
      {{ lang.name }}
    </button>
  </div>
</template>

<script setup>
import { useI18n } from '@i18n-plugin/core/vue3'

const { locale, setLocale } = useI18n()

const languages = [
  { code: 'zh-CN', name: '中文' },
  { code: 'en-US', name: 'English' },
  { code: 'ja-JP', name: '日本語' }
]
</script>

<style scoped>
.language-switcher {
  display: flex;
  gap: 10px;
}

button {
  padding: 5px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: white;
  cursor: pointer;
}

button.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}
</style>
```

### 6.3 语言包管理最佳实践

1. **目录结构**：
   ```
   src/
   ├── locales/
   │   ├── zh-CN.json
   │   ├── en-US.json
   │   └── ja-JP.json
   └── components/
   ```

2. **语言包格式**：
   ```json
   {
     "欢迎使用": "Welcome",
     "请输入用户名": "Please enter username",
     "已选择 {0} 项": "Selected {0} items"
   }
   ```

3. **按需加载**：
   ```ts
   // 仅在需要时加载语言包
   const loadLanguage = async (locale) => {
     const messages = await import(`./locales/${locale}.json`)
     i18n.loadMessages(locale, messages.default)
   }
   ```

## 7. 故障排查

### 7.1 常见问题

1. **中文未被转换**
   - 检查构建工具配置是否正确
   - 确认文件扩展名是否在 include 范围内
   - 检查是否添加了 i18n-ignore 注释

2. **语言切换不生效**
   - 确认是否正确调用了 setLocale 方法
   - 检查组件是否使用了 useI18n Hook（React）或注入了 $i18n（Vue）
   - 验证语言包是否正确加载

3. **插值替换不工作**
   - 确保使用了正确的插值格式：`{0}`, `{1}`
   - 检查传递的参数数量是否与插值占位符匹配

4. **CLI 工具提取失败**
   - 检查源码目录是否存在
   - 确认文件权限是否正确
   - 验证文件格式是否符合要求

### 7.2 调试技巧

1. **查看编译结果**：检查编译后的文件，确认中文是否被正确转换为 $t() 调用

2. **检查语言包**：验证语言包文件是否正确生成，包含所有需要的键

3. **使用开发工具**：在浏览器开发者工具中检查 i18n 实例状态

4. **启用调试模式**：
   ```ts
   I18nPlugin({
     debug: true // 启用调试模式
   })
   ```

## 8. 性能优化

### 8.1 编译时优化

- **按需转换**：只转换需要国际化的文件
- **缓存机制**：利用构建工具的缓存，避免重复转换
- **增量编译**：只处理修改过的文件

### 8.2 运行时优化

- **按需加载**：只加载当前语言的语言包
- **防抖处理**：语言切换时使用防抖，避免频繁更新
- **缓存翻译结果**：对于相同的键和参数，缓存翻译结果

### 8.3 最佳实践

- **合理组织语言包**：按模块或功能拆分语言包
- **避免深层嵌套**：语言包结构尽量扁平化，减少查找时间
- **使用统一的命名规范**：建立清晰的键名命名规范，便于维护

## 9. 迁移指南

### 9.1 从其他 i18n 解决方案迁移

1. **移除旧的 i18n 依赖**：
   ```bash
   pnpm remove vue-i18n react-i18next
   ```

2. **安装 i18n-plugin**：
   ```bash
   pnpm add @i18n-plugin/core @i18n-plugin/unplugin
   ```

3. **更新配置**：按照本文档的配置指南，更新构建工具配置

4. **移除手动 $t() 调用**：i18n-plugin 会自动转换，无需手动包裹

5. **提取中文生成字典**：使用 CLI 工具提取现有中文，生成语言包

### 9.2 版本升级

当升级 i18n-plugin 版本时，建议：

1. **查看变更日志**：了解版本变更内容
2. **测试构建**：确保编译正常
3. **验证功能**：确保所有国际化功能正常工作

## 10. 贡献指南

### 10.1 开发环境搭建

```bash
# 克隆仓库
git clone https://github.com/your-repo/i18n-plugin.git
cd i18n-plugin

# 安装依赖
pnpm install

# 构建所有包
pnpm build

# 运行示例项目
cd examples/vue3-demo
pnpm dev
```

### 10.2 代码规范

- 遵循 TypeScript 编码规范
- 使用 ESLint 进行代码检查
- 提交代码前运行测试

### 10.3 提交 PR

1. Fork 仓库
2. 创建 feature 分支
3. 提交代码
4. 运行测试
5. 提交 PR

## 11. 常见问题解答

### Q: 如何处理动态生成的文本？

A: 对于动态生成的文本，需要手动使用 $t() 函数：

```js
const dynamicKey = 'status_' + status
const message = $t(dynamicKey)
```

### Q: 如何处理复数形式？

A: 可以在语言包中定义不同的复数形式，然后根据数量选择：

```json
{
  "item_one": "1 项",
  "item_many": "{0} 项"
}
```

```js
const message = count === 1 ? $t('item_one') : $t('item_many', count)
```

### Q: 如何处理 HTML 标签？

A: 对于包含 HTML 标签的文本，建议使用插槽或手动处理：

```vue
<template>
  <div v-html="$t('包含 <b>粗体</b> 的文本')"></div>
</template>
```

### Q: 如何在非组件文件中使用 i18n？

A: 可以使用全局实例：

```js
import { getGlobalI18n } from '@i18n-plugin/core'

const i18n = getGlobalI18n()
const message = i18n.t('欢迎使用')
```

## 12. 许可证

MIT

## 13. 联系方式

- 项目地址：https://github.com/your-repo/i18n-plugin
- 问题反馈：https://github.com/your-repo/i18n-plugin/issues
- 贡献代码：https://github.com/your-repo/i18n-plugin/pulls
