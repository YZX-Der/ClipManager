const fs = require('fs');
const path = require('path');

/**
 * 历史记录存储模块
 * 负责管理剪贴板历史记录的增删改查和图片存储
 */

// 内存中的历史记录
let records = [];
// 历史记录文件路径
let historyPath = '';

/**
 * 初始化存储模块
 * @param {string} saveDir - 保存目录路径
 */
function init(saveDir) {
  // 确保目录存在
  if (!fs.existsSync(saveDir)) {
    fs.mkdirSync(saveDir, { recursive: true });
  }

  historyPath = path.join(saveDir, 'history.json');

  // 加载已有历史记录
  if (fs.existsSync(historyPath)) {
    try {
      const data = fs.readFileSync(historyPath, 'utf-8');
      records = JSON.parse(data);
    } catch (e) {
      console.error('加载历史记录失败:', e.message);
      records = [];
    }
  }
}

/**
 * 持久化历史记录到文件
 */
function persist() {
  try {
    fs.writeFileSync(historyPath, JSON.stringify(records, null, 2), 'utf-8');
  } catch (e) {
    console.error('保存历史记录失败:', e.message);
  }
}

/**
 * 保存文本记录
 * @param {string} text - 文本内容
 * @param {string} hash - 内容哈希值
 * @returns {Object|null} 新记录，重复则返回 null
 */
function saveTextRecord(text, hash) {
  // 去重：检查是否已存在相同内容
  const exists = records.find(r => r.hash === hash);
  if (exists) return null;

  const record = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    type: 'text',
    content: text,
    hash: hash,
    size: Buffer.byteLength(text, 'utf-8'),
    createdAt: new Date().toISOString(),
  };

  records.unshift(record);
  persist();
  return record;
}

/**
 * 保存图片记录
 * @param {Buffer} buffer - 图片二进制数据
 * @param {string} hash - 内容哈希值
 * @param {string} format - 图片格式（png/jpg）
 * @returns {Object|null} 新记录，重复则返回 null
 */
function saveImageRecord(buffer, hash, format = 'png') {
  const exists = records.find(r => r.hash === hash);
  if (exists) return null;

  const saveDir = path.dirname(historyPath);
  const fileName = `${Date.now()}-${hash.slice(0, 8)}.${format}`;
  const filePath = path.join(saveDir, 'images', fileName);

  // 确保图片目录存在
  const imgDir = path.dirname(filePath);
  if (!fs.existsSync(imgDir)) {
    fs.mkdirSync(imgDir, { recursive: true });
  }

  // 写入图片文件
  fs.writeFileSync(filePath, buffer);

  const record = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    type: 'image',
    content: filePath,
    hash: hash,
    size: buffer.length,
    createdAt: new Date().toISOString(),
  };

  records.unshift(record);
  persist();
  return record;
}

/**
 * 删除单条记录（同时删除关联的图片文件）
 * @param {string} id - 记录 ID
 */
function deleteRecord(id) {
  const idx = records.findIndex(r => r.id === id);
  if (idx === -1) return;

  const record = records[idx];

  // 如果是图片记录，删除对应文件
  if (record.type === 'image' && record.content && fs.existsSync(record.content)) {
    try {
      fs.unlinkSync(record.content);
    } catch (e) {
      console.error('删除图片文件失败:', e.message);
    }
  }

  records.splice(idx, 1);
  persist();
}

/**
 * 清空所有记录（同时删除所有图片文件）
 */
function clearAll() {
  records.forEach(r => {
    if (r.type === 'image' && r.content && fs.existsSync(r.content)) {
      try {
        fs.unlinkSync(r.content);
      } catch (e) {
        // 忽略删除失败
      }
    }
  });

  records = [];
  persist();
}

/**
 * 根据保留天数清理过期记录
 * @param {number} retentionDays - 保留天数，-1 表示不清理
 */
function cleanupByRetention(retentionDays) {
  if (retentionDays < 0) return;

  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const toDelete = records.filter(r => new Date(r.createdAt).getTime() < cutoff);

  toDelete.forEach(r => {
    if (r.type === 'image' && r.content && fs.existsSync(r.content)) {
      try {
        fs.unlinkSync(r.content);
      } catch (e) {
        // 忽略
      }
    }
  });

  records = records.filter(r => new Date(r.createdAt).getTime() >= cutoff);
  if (toDelete.length > 0) {
    persist();
  }
}

/**
 * 获取所有历史记录
 * @returns {Array} 历史记录列表
 */
function getAll() {
  return records;
}

module.exports = {
  init,
  getAll,
  saveTextRecord,
  saveImageRecord,
  deleteRecord,
  clearAll,
  cleanupByRetention,
};
