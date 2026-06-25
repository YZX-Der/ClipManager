const { app } = require('electron');
const path = require('path');
const fs = require('fs');

/**
 * 应用配置管理模块
 * 负责读取、保存和管理应用的所有配置项
 */

// 默认配置
const DEFAULT_CONFIG = {
  // 剪贴板记录保存目录
  saveDir: path.join(app.getPath('home'), 'ClipboardHistory'),
  // 保留天数（-1 表示永久保留）
  retentionDays: 7,
  // 是否监听剪贴板
  clipboardMonitoring: false,
  hotkey: "CmdOrCtrl+Shift+V",
  theme: "system",
};

// 配置文件路径
const configPath = path.join(app.getPath('userData'), 'config.json');

/**
 * 读取配置文件
 * @returns {Object} 当前配置，如果文件不存在则返回默认配置
 */
function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    }
  } catch (e) {
    console.error('读取配置文件失败:', e.message);
  }
  return { ...DEFAULT_CONFIG };
}

/**
 * 保存配置到文件
 * @param {Object} config - 要保存的配置对象
 */
function saveConfig(config) {
  try {
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (e) {
    console.error('保存配置文件失败:', e.message);
  }
}

/**
 * 获取配置值
 * @param {string} key - 配置键名
 * @returns {*} 配置值
 */
function getConfig(key) {
  const config = loadConfig();
  return key ? config[key] : config;
}

module.exports = { loadConfig, saveConfig, getConfig, DEFAULT_CONFIG };
