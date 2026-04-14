## 技术栈

- ⚡ **Vue 3** - 渐进式 JavaScript 框架
- 🚀 **Vite** - 下一代前端构建工具
- 🎨 **UnoCSS** - 即时按需的原子化 CSS 引擎
- 🧩 **Element Plus** - 基于 Vue 3 的组件库
- 🔍 **ESLint** - 代码质量检查工具
- 💅 **Prettier** - 代码格式化工具
- 🔧 **WebExtension Polyfill** - 跨浏览器扩展 API

## 快速启动

1. 下载：`git clone https://gitcode.com/BluerAngala/template-chrome-crx-vue-js.git`。请确保你的 `Node.js` 版本 >= **14**。
2. 在 `src/manifest` 中更改或配置你的扩展名称。
3. 运行 `pnpm install` 安装依赖（也可使用 `npm install`）。
4. 运行 `pnpm dev` 进行测试（也可使用 `npm run dev`）。

## 开发

运行以下命令：

```shell
$ cd my-crx

$ npm run dev
```

### Chrome 扩展开发者模式

1. 打开 Chrome 浏览器的“开发者模式”
2. 点击“加载已解压的扩展”，选择 `my-crx/build` 文件夹

### 普通前端开发模式

1. 访问 `http://0.0.0.0:3000/`
2. 调试弹窗页面时，打开 `http://0.0.0.0:3000/src/pages/popup/popup.html`
3. 调试选项页面时，打开 `http://0.0.0.0:3000/src/pages/options/options.html`

## 打包

扩展开发完成后，运行以下命令：

```shell
$ npm run build
$ npm run zip
```

此时，`build` 文件夹中的内容就是可以提交到 Chrome Web Store 的扩展包。

`zip` 是压缩包，方便分发。

详情请参考 [官方指南](https://developer.chrome.com/webstore/publish) 获取更多发布信息。

---

## 主要页面及功能

### 1.**popup.html / src/pages/popup/Popup.vue**

- 功能：弹出页（Popup），通常在点击浏览器扩展图标时显示。
- 具体功能：
  - 一个简单的计数器（加减按钮，数据持久化在 chrome.storage.sync）。
  - “打开侧边栏”按钮（通过消息通知后台打开扩展侧边栏）。
  - 页脚有项目链接。

![PixPin_2025-07-01_12-20-16](https://i-blog.csdnimg.cn/img_convert/ab4a6e378491c215ad9b11fc8cb8501b.png)

### 2.**sidepanel.html / src/pages/sidepanel/SidePanel.vue**

- 功能：扩展的侧边栏页面。
- 具体功能：需查看源码细节，但一般用于在浏览器侧边栏展示扩展内容。

![PixPin_2025-07-01_12-21-09](https://i-blog.csdnimg.cn/img_convert/46a402f047c77ea6a0f1372e1c27b1eb.png)

### 3.**options.html / src/pages/options/Options.vue**

- 功能：扩展的“选项”页面，用户可以在这里设置扩展的相关配置。
- 具体功能：具体内容需看源码，但一般为设置项表单等。

![PixPin_2025-07-01_12-21-45](https://i-blog.csdnimg.cn/img_convert/db349cc6f7a484fd762f675ccc2f8475.png)

### 4.**newtab.html / src/newtab/NewTab.vue**

- 功能：新标签页页面，安装扩展后可替换浏览器新标签页。
- 具体功能：具体内容需看源码，通常为自定义的新标签页内容。

![PixPin_2025-07-01_12-22-27](https://i-blog.csdnimg.cn/img_convert/3e5f001938e2dc36251546be068f00b8.png)

### 5.**devtools.html / src/pages/devtools/DevTools.vue**

- 功能：开发者工具页面，扩展可在 Chrome DevTools 中嵌入自定义面板。
- 具体功能：具体内容需看源码，通常为调试或开发辅助工具。

![PixPin_2025-07-01_12-23-05](https://i-blog.csdnimg.cn/img_convert/7e2a35f67195af535ee998c6db03498a.png)

### 6.**contentScript/index.js**

- 功能：内容脚本，注入到网页中实现与页面的交互。
- 具体功能：需看源码，通常用于操作网页 DOM 或与页面通信。

![PixPin_2025-07-01_12-23-55](https://i-blog.csdnimg.cn/img_convert/194384d6fb38d683a20946e45df32acd.png)

### 7.**background/index.js**

- 功能：后台脚本，负责扩展的全局逻辑和事件监听。
- 具体功能：如消息转发、持久化、与浏览器 API 交互等。

![PixPin_2025-07-01_12-24-14](https://i-blog.csdnimg.cn/img_convert/71c263f00c1792601205671dc2be5b4f.png)

---

## 补充

### UnoCSS 样式系统

本项目使用 UnoCSS 作为样式解决方案，提供：

- ✨ 原子化 CSS 类，开发更快速
- 📦 按需生成，体积更小
- 🎯 与 Tailwind CSS 兼容的语法
- 📚 详细使用说明请查看：[UnoCSS 使用指南](./md/unocss-guide.md)

### 代码质量保障

配置了完整的代码质量检查工具：

- ✅ ESLint 9 - 代码规范和错误检查
- ✅ Prettier - 代码自动格式化
- ✅ 支持 Vue 3、UnoCSS 规则
- 📚 详细使用说明请查看：[ESLint 使用指南](./md/eslint-guide.md)

**常用命令：**

```bash
pnpm lint        # ESLint 检查并自动修复
pnpm lint:check  # 仅检查不修复
pnpm fmt         # Prettier 格式化
pnpm format      # ESLint + Prettier 完整格式化
```

**推荐的 Bug 排查流程：**

```bash
# 1. 先运行完整格式化（修复大部分代码风格问题）
pnpm format

# 2. 检查是否还有未自动修复的问题
pnpm lint:check

# 3. 构建项目（会自动执行格式化）
pnpm build
```

**配置说明：**

- **ESLint 配置**：`eslint.config.js`
  - JavaScript 推荐规则
  - Vue 3 推荐规则
  - Prettier 集成
  - Chrome 扩展 API 全局变量已定义

- **检查的文件类型**：`.js`, `.mjs`, `.cjs`, `.vue`

**开发建议：**

1. **开发时**：定期运行 `pnpm lint` 保持代码规范
2. **提交前**：运行 `pnpm format` 确保代码风格一致
3. **构建时**：`pnpm build` 会自动调用 `pnpm format`

### 图标logo获取

- 图标logo获取：[iconfont](https://www.iconfont.cn/)
- 下载合适的 logo 图标，将其重命名为 `logo.png` 并替换 `public` 目录下的 `logo.png` 文件。
- 运行 `npm run generate-logos` 自动生成不同尺寸的图标。
