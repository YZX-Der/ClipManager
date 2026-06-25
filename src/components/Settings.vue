<template>
  <div class="settings-overlay" @click.self="$emit('close')">
    <div class="settings-panel">
      <div class="panel-glass"></div>

      <div class="settings-header">
        <h3>⚙️ 设置</h3>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <div class="settings-body">
        <!-- 主题切换 -->
        <div class="setting-group">
          <label class="setting-label">主题</label>
          <div class="theme-options">
            <label class="theme-option" :class="{ active: config.theme === 'system' }">
              <input type="radio" value="system" v-model="config.theme" class="sr-only" @change="previewTheme" />
              <span class="theme-icon">💻</span>
              <span class="theme-text">跟随系统</span>
            </label>
            <label class="theme-option" :class="{ active: config.theme === 'light' }">
              <input type="radio" value="light" v-model="config.theme" class="sr-only" @change="previewTheme" />
              <span class="theme-icon">☀️</span>
              <span class="theme-text">浅色</span>
            </label>
            <label class="theme-option" :class="{ active: config.theme === 'dark' }">
              <input type="radio" value="dark" v-model="config.theme" class="sr-only" @change="previewTheme" />
              <span class="theme-icon">🌙</span>
              <span class="theme-text">深色</span>
            </label>
          </div>
        </div>

        <!-- 热键设置 -->
        <div class="setting-group">
          <label class="setting-label">快捷键</label>
          <div class="hotkey-input-row">
            <input
              type="text"
              class="hotkey-input"
              :value="hotkeyDisplay"
              @keydown.prevent="captureHotkey"
              placeholder="点击后按下快捷键"
              readonly
            />
            <button class="browse-btn" @click="resetHotkey">重置</button>
          </div>
          <div class="setting-hint">点击输入框后按下你想要的快捷键组合，默认 ⌘⇧V</div>
        </div>

        <!-- 保存目录 -->
        <div class="setting-group">
          <label class="setting-label">保存目录</label>
          <div class="setting-row">
            <input type="text" class="setting-input" v-model="config.saveDir" readonly />
            <button class="browse-btn" @click="selectSaveDir">选择</button>
            <button class="browse-btn" @click="openSaveDir">打开</button>
          </div>
          <div class="setting-hint">剪贴板记录和图片将保存到此目录</div>
        </div>

        <!-- 保留时间 -->
        <div class="setting-group">
          <label class="setting-label">记录保留时间</label>
          <div class="retention-options">
            <label v-for="opt in retentionOptions" :key="opt.value" class="retention-option" :class="{ active: config.retentionDays === opt.value }">
              <input type="radio" :value="opt.value" v-model="config.retentionDays" class="sr-only" />
              <span>{{ opt.label }}</span>
            </label>
          </div>
          <div v-if="isCustomRetention" class="custom-days">
            <input type="number" class="days-input" v-model.number="customDays" min="1" max="365" placeholder="天数" />
            <span class="days-unit">天</span>
          </div>
        </div>

        <!-- 自动保存开关 -->
        <div class="setting-group">
          <div class="setting-row">
            <label class="setting-label" style="margin-bottom: 0">自动保存剪贴板记录</label>
            <label class="toggle">
              <input type="checkbox" v-model="config.clipboardMonitoring" />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="setting-hint">开启后自动监听并保存复制的内容</div>
        </div>
      </div>

      <div class="settings-footer" @click.stop>
        <button class="btn-cancel" @click="$emit('close')">取消</button>
        <button class="btn-save" @click="handleSave">保存</button>
      </div>
    </div>
  </div>
</template>

<script>
var ipcRenderer = window.require('electron').ipcRenderer;

export default {
  name: 'Settings',
  data: function () {
    return {
      config: { saveDir: '', retentionDays: 7, clipboardMonitoring: false, theme: 'system', hotkey: 'CmdOrCtrl+Shift+V' },
      customDays: 30,
      retentionOptions: [
        { label: '1 天', value: 1 },
        { label: '2 天', value: 2 },
        { label: '7 天', value: 7 },
        { label: '30 天', value: 30 },
        { label: '永久', value: -1 },
      ],
    };
  },
  computed: {
    /**
     * 格式化快捷键显示，将 CmdOrCtrl 替换为 Cmd/Ctrl
     * @returns {string} 格式化后的快捷键字符串
     */
    hotkeyDisplay: function () {
      return (this.config.hotkey || '').replace(/CmdOrCtrl/g, 'Cmd/Ctrl');
    },
    isCustomRetention: function () {
      var self = this;
      return !this.retentionOptions.some(function (opt) { return opt.value === self.config.retentionDays; });
    },
  },
  mounted: function () {
    var self = this;
    ipcRenderer.invoke('get-config').then(function (cfg) {
      self.config = Object.assign({}, cfg);
      if (!self.config.theme) self.config.theme = 'system';
      if (!self.config.hotkey) self.config.hotkey = 'CmdOrCtrl+Shift+V';
      if (!self.retentionOptions.some(function (opt) { return opt.value === cfg.retentionDays; })) {
        self.customDays = cfg.retentionDays;
        self.config.retentionDays = -2;
      }
    });
  },
  methods: {
    selectSaveDir: function () {
      var self = this;
      ipcRenderer.invoke('select-save-dir').then(function (selectedPath) {
        if (selectedPath) self.config.saveDir = selectedPath;
      });
    },
    openSaveDir: function () {
      ipcRenderer.invoke('open-save-dir');
    },
    captureHotkey: function (e) {
      if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;
      var parts = [];
      if (e.ctrlKey || e.metaKey) parts.push('CmdOrCtrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');
      var key = e.key;
      if (key === ' ') key = 'Space';
      else if (key === 'Escape') return;
      if (key.length === 1) key = key.toUpperCase();
      parts.push(key);
      this.config.hotkey = parts.join('+');
    },
    resetHotkey: function () {
      this.config.hotkey = 'CmdOrCtrl+Shift+V';
    },
    previewTheme: function () {
      this.$emit('theme-preview', this.config.theme);
    },
    handleSave: function () {
      if (this.config.retentionDays === -2) {
        this.config.retentionDays = this.customDays || 7;
      }
      this.$emit('save', Object.assign({}, this.config));
    },
  },
};
</script>

<style scoped>
.settings-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.settings-panel {
  position: relative; width: 350px; max-height: 90vh;
  border-radius: 16px; overflow: hidden;
  display: flex; flex-direction: column;
}
.panel-glass {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(40px) saturate(200%);
  -webkit-backdrop-filter: blur(40px) saturate(200%);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.6);
  z-index: 0;
}
.settings-header {
  position: relative; z-index: 1;
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 18px; border-bottom: 1px solid rgba(255, 255, 255, 0.35);
  flex-shrink: 0;
}
.settings-header h3 { font-size: 16px; font-weight: 600; color: rgba(0, 0, 0, 0.85); }
.close-btn {
  background: rgba(0, 0, 0, 0.06); border: none; font-size: 14px;
  color: rgba(0, 0, 0, 0.5); cursor: pointer;
  width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
  border-radius: 50%; transition: all 0.2s;
}
.close-btn:hover { background: rgba(0, 0, 0, 0.12); }
.settings-body {
  position: relative; z-index: 1; padding: 18px;
  overflow-y: auto; flex: 1; max-height: 60vh;
}
.settings-body::-webkit-scrollbar { width: 4px; }
.settings-body::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 2px; }
.setting-group { margin-bottom: 16px; }
.setting-group:last-child { margin-bottom: 0; }
.setting-label { display: block; font-size: 13px; font-weight: 500; color: rgba(0, 0, 0, 0.7); margin-bottom: 8px; }
.setting-row { display: flex; align-items: center; gap: 8px; }
.setting-input {
  flex: 1; padding: 9px 12px; font-size: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08); border-radius: 10px;
  background: rgba(255, 255, 255, 0.5); color: rgba(0, 0, 0, 0.7); outline: none;
}
.setting-input:focus { border-color: rgba(0, 122, 255, 0.4); }
.browse-btn {
  padding: 9px 14px; font-size: 12px; font-weight: 500;
  background: rgba(255, 255, 255, 0.5); border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px; cursor: pointer; color: rgba(0, 0, 0, 0.65); flex-shrink: 0;
}
.browse-btn:hover { background: rgba(255, 255, 255, 0.75); }
.setting-hint { font-size: 11px; color: rgba(0, 0, 0, 0.3); margin-top: 6px; }
/* 主题选项 */
.theme-options { display: flex; gap: 8px; }
.theme-option {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 8px 8px; border-radius: 12px; cursor: pointer;
  border: 1px solid rgba(0, 0, 0, 0.08); background: rgba(255, 255, 255, 0.4);
  transition: all 0.25s ease;
}
.theme-option:hover { background: rgba(255, 255, 255, 0.7); border-color: rgba(0, 122, 255, 0.3); }
.theme-option.active { background: rgba(0, 122, 255, 0.1); border-color: rgba(0, 122, 255, 0.5); }
.theme-icon { font-size: 18px; }
.theme-text { font-size: 11px; color: rgba(0, 0, 0, 0.6); font-weight: 500; }
.theme-option.active .theme-text { color: rgba(0, 122, 255, 0.9); }
/* 热键输入 */
.hotkey-input-row { display: flex; align-items: center; gap: 8px; }
.hotkey-input {
  flex: 1; padding: 9px 12px; font-size: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08); border-radius: 10px;
  background: rgba(255, 255, 255, 0.5); color: rgba(0, 0, 0, 0.7); outline: none;
  cursor: pointer; text-align: center; font-weight: 500;
}
.hotkey-input:focus { border-color: rgba(0, 122, 255, 0.4); }
.retention-options { display: flex; flex-wrap: wrap; gap: 6px; }
.retention-option {
  padding: 7px 14px; font-size: 12px; font-weight: 500;
  border: 1px solid rgba(0, 0, 0, 0.08); border-radius: 20px;
  cursor: pointer; transition: all 0.25s ease;
  color: rgba(0, 0, 0, 0.55); background: rgba(255, 255, 255, 0.4);
}
.retention-option:hover { background: rgba(255, 255, 255, 0.7); border-color: rgba(0, 122, 255, 0.3); color: rgba(0, 122, 255, 0.9); }
.retention-option.active {
  background: rgba(0, 122, 255, 0.85); border-color: rgba(0, 122, 255, 0.9);
  color: #fff; box-shadow: 0 2px 12px rgba(0, 122, 255, 0.25);
}
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }
.custom-days { display: flex; align-items: center; gap: 6px; margin-top: 8px; }
.days-input {
  width: 80px; padding: 7px 10px; font-size: 13px;
  border: 1px solid rgba(0, 0, 0, 0.08); border-radius: 10px;
  background: rgba(255, 255, 255, 0.5); outline: none;
}
.days-input:focus { border-color: rgba(0, 122, 255, 0.4); }
.days-unit { font-size: 13px; color: rgba(0, 0, 0, 0.5); }
.toggle { position: relative; display: inline-block; width: 46px; height: 26px; flex-shrink: 0; }
.toggle input { opacity: 0; width: 0; height: 0; }
.toggle-slider {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.15); border-radius: 13px; cursor: pointer; transition: all 0.3s ease;
}
.toggle-slider::before {
  content: ''; position: absolute; width: 22px; height: 22px;
  left: 2px; top: 2px; background: #fff; border-radius: 50%;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
}
.toggle input:checked + .toggle-slider { background: rgba(52, 199, 89, 0.85); }
.toggle input:checked + .toggle-slider::before { transform: translateX(20px); }
.settings-footer {
  position: relative; z-index: 2;
  display: flex; justify-content: flex-end; gap: 8px;
  padding: 14px 18px; border-top: 1px solid rgba(255, 255, 255, 0.35);
  flex-shrink: 0;
}
.btn-cancel, .btn-save {
  padding: 9px 22px; font-size: 13px; font-weight: 500;
  border-radius: 10px; border: none; cursor: pointer;
}
.btn-cancel { background: rgba(0, 0, 0, 0.06); color: rgba(0, 0, 0, 0.6); }
.btn-cancel:hover { background: rgba(0, 0, 0, 0.1); }
.btn-save { background: rgba(0, 122, 255, 0.85); color: #fff; box-shadow: 0 2px 12px rgba(0, 122, 255, 0.25); }
.btn-save:hover { background: rgba(0, 122, 255, 0.95); }

/* 深色主题 */
[data-theme="dark"] .settings-overlay { background: rgba(0, 0, 0, 0.45); }
[data-theme="dark"] .panel-glass {
  background: rgba(44, 44, 46, 0.75); border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08);
}
[data-theme="dark"] .settings-header { border-bottom-color: rgba(255, 255, 255, 0.1); }
[data-theme="dark"] .settings-header h3 { color: rgba(255, 255, 255, 0.85); }
[data-theme="dark"] .close-btn { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.5); }
[data-theme="dark"] .close-btn:hover { background: rgba(255,255,255,0.15); }
[data-theme="dark"] .setting-label { color: rgba(255, 255, 255, 0.7); }
[data-theme="dark"] .setting-input {
  background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.7);
}
[data-theme="dark"] .browse-btn {
  background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.65);
}
[data-theme="dark"] .browse-btn:hover { background: rgba(255,255,255,0.15); }
[data-theme="dark"] .setting-hint { color: rgba(255,255,255,0.3); }
[data-theme="dark"] .settings-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); }
[data-theme="dark"] .theme-option { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.1); }
[data-theme="dark"] .theme-option:hover { background: rgba(255,255,255,0.12); }
[data-theme="dark"] .theme-option.active { background: rgba(0,122,255,0.2); border-color: rgba(0,122,255,0.5); }
[data-theme="dark"] .theme-text { color: rgba(255,255,255,0.6); }
[data-theme="dark"] .theme-option.active .theme-text { color: rgba(0,166,255,0.9); }
[data-theme="dark"] .hotkey-input {
  background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.7);
}
[data-theme="dark"] .retention-option {
  background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.55);
}
[data-theme="dark"] .retention-option:hover { background: rgba(255,255,255,0.12); color: rgba(0,166,255,0.9); }
[data-theme="dark"] .retention-option.active {
  background: rgba(0,122,255,0.9); border-color: rgba(0,122,255,1);
  color: #fff; box-shadow: 0 2px 12px rgba(0,122,255,0.35);
}
[data-theme="dark"] .days-input {
  background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.1); color: rgba(255,255,255,0.7);
}
[data-theme="dark"] .days-unit { color: rgba(255,255,255,0.5); }
[data-theme="dark"] .toggle-slider { background: rgba(255,255,255,0.2); }
[data-theme="dark"] .settings-footer { border-top-color: rgba(255, 255, 255, 0.1); }
[data-theme="dark"] .btn-cancel { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); }
[data-theme="dark"] .btn-cancel:hover { background: rgba(255,255,255,0.18); }
</style>
