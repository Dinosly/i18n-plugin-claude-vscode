const { transformVue } = require('./packages/unplugin/src/transformVue.ts');
const fs = require('fs');

const appVue = fs.readFileSync('./examples/vue2-demo/src/App.vue', 'utf-8');

console.log('=== Original Template (first 500 chars) ===');
console.log(appVue.substring(0, 500));

console.log('\n=== Testing Vue 2 Transform ===');
const result = transformVue(appVue, 'App.vue', 2);

if (result) {
  console.log('\n=== Transformed Template (first 800 chars) ===');
  console.log(result.substring(0, 800));

  // Check if Chinese text was transformed
  if (result.includes("$t('欢迎使用自动化国际化方案')")) {
    console.log('\n✅ SUCCESS: Chinese text transformed to $t() calls');
  } else {
    console.log('\n❌ FAILED: Chinese text NOT transformed');
    console.log('Searching for "欢迎使用" in result:', result.includes('欢迎使用'));
  }
} else {
  console.log('❌ Transform returned null');
}
