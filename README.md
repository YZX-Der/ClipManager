# Electron + Vue 2 菜单栏应用项目

这是一个简单的 macOS 菜单栏（Tray）应用演示项目。

## 如何运行

由于 Electron 需要在你的本地屏幕环境下打开 GUI 窗口，请按以下步骤操作：

1.  **打开终端并进入项目目录**：
    ```bash
    cd /Users/yzx/工作/Document/electron-tray-demo
    ```

2.  **启动 Vite 开发服务器**（第一个终端窗口）：
    ```bash
    npm run dev
    ```

3.  **启动 Electron**（第二个终端窗口）：
    ```bash
    npm run electron:dev
    ```

## 项目特色
- **菜单栏图标**：在顶部状态栏显示图标。
- **自动定位窗口**：点击图标后，窗口会自动显示在图标正下方。
- **Vue 2 支持**：所有的界面逻辑都使用 Vue 2 开发。
- **失去焦点自动隐藏**：点击屏幕其他地方，窗口会自动收起。

## 文件结构
- `electron/main.js`: Electron 主进程，控制 Tray 和窗口。
- `src/`: Vue 2 源代码。
- `vite.config.js`: Vite 配置文件。
