import { compileTemplate } from "@vue/compiler-sfc";

// const template = `<p>当前语言: {{ currentLocale }}</p>`;
const template = `<input type="text" placeholder="请输入用户名" />`;

const { ast } = compileTemplate({
  source: template,
  filename: "test.vue",
  id: "test",
});

console.log(JSON.stringify(ast, null, 2));
