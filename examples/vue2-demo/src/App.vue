<template>
  <div class="app">
    <header>
      <h1>企业级前端全自动化 I18n 示例 - Vue2</h1>
      <div class="language-switcher">
        <button @click="switchLang('zh-CN')">中文</button>
        <button @click="switchLang('en-US')">English</button>
      </div>
    </header>

    <main>
      <section class="demo-section">
        <h2>基础文本示例</h2>
        <p>欢迎使用自动化国际化方案</p>
        <p>当前语言: {{ currentLocale }}</p>
      </section>

      <section class="demo-section">
        <h2>表单示例</h2>
        <form @submit.prevent="handleSubmit">
          <input type="text" placeholder="请输入用户名" />
          <input type="password" placeholder="请输入密码" />
          <button type="submit">提交</button>
        </form>
      </section>

      <section class="demo-section">
        <h2>插值示例</h2>
        <p>{{ getMessage() }}</p>
      </section>

      <section class="demo-section">
        <h2>忽略示例</h2>
        <!-- i18n-ignore -->
        <p>This text will not be translated</p>
      </section>
    </main>
  </div>
</template>

<script>
export default {
  name: "App",
  data() {
    return {
      count: 5,
    };
  },
  computed: {
    currentLocale() {
      console.log(1111111, this.$t);
      return this.$i18n.locale;
    },
  },
  methods: {
    getMessage() {
      // 这里的模板字符串会被自动转换
      return `已选择 ${this.count} 项`;
    },
    async switchLang(lang) {
      await this.$root.switchLocale(lang);
    },
    handleSubmit() {
      alert("表单提交成功");
    },
  },
};
</script>

<style>
.app {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #eee;
}

h1 {
  font-size: 24px;
  color: #333;
}

.language-switcher button {
  margin-left: 10px;
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
}

.language-switcher button:hover {
  background: #f5f5f5;
}

.demo-section {
  margin-bottom: 30px;
}

.demo-section h2 {
  font-size: 18px;
  color: #555;
  margin-bottom: 15px;
}

form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 300px;
}

input {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

button[type="submit"] {
  padding: 10px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button[type="submit"]:hover {
  background: #0056b3;
}

p {
  line-height: 1.6;
  color: #666;
}
</style>
