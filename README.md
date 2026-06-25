# ClipManager

一款轻量的 macOS 菜单栏剪贴板管理工具，基于 Electron + Vue 2 构建。

## 功能特性

- **剪贴板监控**：自动记录复制的文字和图片内容
- **搜索与筛选**：支持按内容搜索、按类型（文字/图片）和日期筛选
- **一键复制**：点击历史记录即可快速复制到剪贴板
- **菜单栏驻留**：常驻 macOS 顶部菜单栏，不占用 Dock 位置
- **自动隐藏**：失去焦点时窗口自动收起
- **数据管理**：支持删除单条记录、清空历史、导出数据
- **个性化设置**：可配置历史记录上限、开机自启等

## 技术栈

- [Electron](https://www.electronjs.org/) - 跨平台桌面应用框架
- [Vue.js 2](https://vuejs.org/) - 前端 UI 框架
- [Vite](https://vitejs.dev/) - 构建工具

## 安装与运行

### 环境要求

- Node.js >= 16
- macOS（项目目前仅支持 macOS）

### 开发模式

```bash
# 克隆项目
git clone https://github.com/YZX-Der/ClipManager.git
cd ClipManager

# 安装依赖
npm install

# 启动开发服务器（终端 1）
npm run dev

# 启动 Electron（终端 2）
npm run electron:dev
```

### 构建安装包

```bash
# 构建 macOS DMG 安装包
npm run dist:mac
```

构建完成后，安装包位于 `release/` 目录下。

## 项目结构

```
ClipManager/
├── electron/           # Electron 主进程
│   ├── main.js        # 主进程入口，Tray 和窗口管理
│   ├── store.js       # 数据存储
│   ├── config.js      # 配置管理
│   └── icon*.png      # 菜单栏图标
├── src/               # Vue 2 源代码
│   ├── App.vue        # 主界面组件
│   ├── main.js        # Vue 入口
│   └── components/    # 子组件
├── index.html         # HTML 入口
├── vite.config.js     # Vite 配置
└── package.json       # 项目配置
```

## License

[ISC](./LICENSE)
