# CRX3 自动打包说明

## 功能介绍

项目已集成 `crx3` 实现自动打包为 `.crx` 格式的浏览器插件安装包。

## 使用方法

### 1. 仅打包 CRX 文件

```bash
pnpm crx
```

此命令会：

- 执行代码格式化和构建
- 生成 `.crx` 文件到 `package` 目录

### 2. 同时打包 ZIP 和 CRX

```bash
pnpm pack
```

此命令会：

- 执行代码格式化和构建
- 生成 `.zip` 文件到 `package` 目录
- 生成 `.crx` 文件到 `package` 目录

### 3. 仅打包 ZIP（原有功能）

```bash
pnpm zip
```

## 生成的文件

### CRX 文件

- 位置：`package/插件名-版本号.crx`
- 用途：可以直接拖拽到 Chrome 浏览器安装

### 私钥文件

- 位置：`keys/key.pem`
- 说明：首次打包时自动生成
- **重要**：此文件已自动添加到 `.gitignore`，不会被提交到 Git
- **务必妥善保管**：后续更新插件时需要使用同一个私钥

### 公钥文件

- 位置：`keys/key.pub`
- 用途：可用于 Chrome Web Store 发布

## 目录结构

```
项目根目录/
├── package/          # 打包输出目录
│   ├── *.zip        # ZIP 格式安装包
│   └── *.crx        # CRX 格式安装包
├── keys/            # 密钥目录（已忽略Git）
│   ├── key.pem      # 私钥文件（重要！）
│   └── key.pub      # 公钥文件
└── scripts/
    └── build-crx.js # CRX 打包脚本
```

## 注意事项

1. **首次打包**：会自动生成私钥并保存到 `keys/key.pem`
2. **后续打包**：会使用已有的私钥，确保插件 ID 保持一致
3. **私钥保管**：`keys` 目录已添加到 `.gitignore`，请通过安全方式备份私钥
4. **团队协作**：如需多人开发，需要共享同一个私钥文件（通过安全渠道）

## 安装 CRX 文件

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的"开发者模式"
4. 将生成的 `.crx` 文件拖拽到浏览器窗口
5. 确认安装

## 技术说明

- 使用 `crx3` 库进行打包
- 支持 Chrome Extension Manifest V3
- 自动生成和管理密钥对
- 与现有的 ZIP 打包流程兼容
