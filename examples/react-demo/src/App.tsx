import React, { useState } from "react";
// import { useI18n } from '@i18n-plugin/core/react'
//@ts-ignore
import { useI18n } from "../../../packages/core/src/react";
import { switchLocale } from "./main";
import "./App.css";

function App() {
  const { locale, t } = useI18n();
  const [count, setCount] = useState(5);

  const handleSwitchLang = async (lang: string) => {
    await switchLocale(lang);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("表单提交成功");
  };

  return (
    <div className="app">
      <header>
        <h1>企业级前端全自动化 I18n 示例</h1>
        <div className="language-switcher">
          <button onClick={() => handleSwitchLang("zh-CN")}>中文</button>
          <button onClick={() => handleSwitchLang("en-US")}>English</button>
        </div>
      </header>

      <main>
        <section className="demo-section">
          <h2>基础文本示例</h2>
          <p>欢迎使用自动化国际化方案</p>
          <p>当前语言: 语种：{locale}</p>
        </section>

        <section className="demo-section">
          <h2>表单示例</h2>
          <form onSubmit={handleSubmit}>
            <input type="text" placeholder="请输入用户名" />
            <input type="password" placeholder="请输入密码" />
            <button type="submit">提交</button>
          </form>
        </section>

        <section className="demo-section">
          <h2>插值示例</h2>
          <p>{`已选择 ${count} 项`}</p>
          <button onClick={() => setCount(count + 1)}>增加</button>
        </section>

        <section className="demo-section">
          <h2>忽略示例</h2>
          {/* i18n-ignore */}
          <p>This text will not be translated</p>
        </section>
      </main>
    </div>
  );
}

export default App;
