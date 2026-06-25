<template>
  <div class="tray-container">
    <!-- 标题栏 -->
    <div class="header">
      <span class="header-title">📋 剪贴板管理</span>
      <span class="header-hint" v-if="records.length > 0 && !showSearch">点击记录复制 · 右上角删除</span>
      <div class="header-actions">
        <button class="icon-btn" :class="{ active: showSearch }" @click="toggleSearch" title="搜索">🔍</button>
        <button class="icon-btn" @click="showSettings = true" title="设置">⚙️</button>
      </div>
    </div>

    <!-- 搜索面板 -->
    <transition name="search-slide">
      <div class="search-panel" v-show="showSearch">
        <!-- 搜索框 -->
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            class="search-input"
            v-model="searchQuery"
            placeholder="搜索文字内容..."
            ref="searchInput"
          />
          <button class="search-clear" v-if="searchQuery" @click="searchQuery = ''">✕</button>
        </div>
        <!-- 筛选行 -->
        <div class="filter-section">
          <div class="filter-row">
            <span class="filter-label">类型</span>
            <div class="filter-pills">
              <label class="pill" :class="{ active: searchType === 'all' }">
                <input type="radio" value="all" v-model="searchType" class="sr-only" />
                <span>全部</span>
              </label>
              <label class="pill" :class="{ active: searchType === 'text' }">
                <input type="radio" value="text" v-model="searchType" class="sr-only" />
                <span>文字</span>
              </label>
              <label class="pill" :class="{ active: searchType === 'image' }">
                <input type="radio" value="image" v-model="searchType" class="sr-only" />
                <span>图片</span>
              </label>
            </div>
          </div>
          <div class="filter-row">
            <span class="filter-label">日期</span>
            <div class="filter-pills">
              <label class="pill" :class="{ active: searchDate === 'all' }">
                <input type="radio" value="all" v-model="searchDate" class="sr-only" />
                <span>全部</span>
              </label>
              <label class="pill" :class="{ active: searchDate === 'today' }">
                <input type="radio" value="today" v-model="searchDate" class="sr-only" />
                <span>今天</span>
              </label>
              <label class="pill" :class="{ active: searchDate === '7days' }">
                <input type="radio" value="7days" v-model="searchDate" class="sr-only" />
                <span>近7天</span>
              </label>
              <label class="pill" :class="{ active: searchDate === '30days' }">
                <input type="radio" value="30days" v-model="searchDate" class="sr-only" />
                <span>近30天</span>
              </label>
              <label class="pill" :class="{ active: searchDate === 'custom' }">
                <input type="radio" value="custom" v-model="searchDate" class="sr-only" />
                <span>自定义</span>
              </label>
            </div>
          </div>
          <!-- 自定义日期 -->
          <transition name="expand">
            <div class="date-range" v-show="searchDate === 'custom'">
              <div class="date-pick" @click="showCalStart = true">
                <span class="date-pick-text" :class="{ empty: !searchDateStart }">{{ searchDateStart || '开始日期' }}</span>
                <button class="date-clear" v-if="searchDateStart" @click.stop="searchDateStart = ''">✕</button>
              </div>
              <span class="date-sep">至</span>
              <div class="date-pick" @click="showCalEnd = true">
                <span class="date-pick-text" :class="{ empty: !searchDateEnd }">{{ searchDateEnd || '结束日期' }}</span>
                <button class="date-clear" v-if="searchDateEnd" @click.stop="searchDateEnd = ''">✕</button>
              </div>
            </div>
          </transition>
          <!-- 日历弹窗 -->
          <transition name="cal-pop"><CalendarPicker v-if="showCalStart" :show="showCalStart" :value="searchDateStart" :maxDate="searchDateEnd || null" @select="onCalStart" @close="showCalStart = false" /></transition>
          <transition name="cal-pop"><CalendarPicker v-if="showCalEnd" :show="showCalEnd" :value="searchDateEnd" :minDate="searchDateStart || null" @select="onCalEnd" @close="showCalEnd = false" /></transition>
        </div>
        <!-- 搜索结果 -->
        <div class="search-footer" v-if="filteredRecords.length !== records.length">
          <span class="result-count">找到 {{ filteredRecords.length }} 条结果</span>
          <button class="reset-btn" @click="resetSearch">清除筛选</button>
        </div>
      </div>
    </transition>

    <!-- 统计栏 -->
    <div class="stats-bar" v-if="filteredRecords.length > 0">
      <span class="stats-text">共 {{ filteredRecords.length }} 条记录{{ showSearch && filteredRecords.length !== records.length ? '（已筛选）' : '' }}</span>
      <button class="clear-btn" @click="handleClearAll">清空全部</button>
    </div>

    <!-- 记录列表 -->
    <transition-group name="record-item" tag="div" class="record-list" v-if="filteredRecords.length > 0">
      <div class="record-item" v-for="(item, index) in filteredRecords" :key="item.id" @click="handleCopy(item)">
        <div class="record-content">
          <div class="record-type-badge">{{ item.type === 'text' ? '📝' : '🖼️' }}</div>
          <div class="record-body">
            <div v-if="item.type === 'text'" class="text-preview">{{ item.content }}</div>
            <div v-else class="image-preview">
              <img v-if="item._imageUrl" :src="item._imageUrl" alt="图片" />
              <div v-else class="image-placeholder">图片加载中</div>
            </div>
            <div class="record-meta">
              <span class="record-time">{{ formatTime(item.createdAt) }}</span>
              <span class="record-size">{{ formatSize(item.size) }}</span>
            </div>
          </div>
        </div>
        <div class="record-actions">
          <button class="action-btn delete-btn" @click.stop="handleDelete(item.id)" title="删除">🗑️</button>
        </div>
      </div>
    </transition-group>

    <!-- 空状态 -->
    <transition name="fade" mode="out-in">
      <div class="empty-state" v-if="filteredRecords.length === 0" :key="showSearch ? 'search' : 'empty'">
        <div class="empty-icon">{{ showSearch ? '🔍' : '📋' }}</div>
        <div class="empty-text">{{ showSearch ? '没有找到匹配的记录' : '暂无剪贴板记录' }}</div>
        <div class="empty-hint">{{ showSearch ? '试试调整筛选条件' : '复制文字或图片后会自动保存到这里' }}</div>
      </div>
    </transition>

    <!-- 设置弹窗 -->
    <transition name="modal">
      <Settings v-if="showSettings" @close="onSettingsClose" @save="handleSaveSettings" @theme-preview="onThemePreview" />
    </transition>

    <!-- 复制成功提示 -->
    <transition name="fade-toast">
      <div class="toast" v-if="showToast">{{ toastText }}</div>
    </transition>
  </div>
</template>

<script>
var ipcRenderer = window.require('electron').ipcRenderer;
import Settings from './components/Settings.vue';
import CalendarPicker from './components/CalendarPicker.vue';

var loadId = 0;

export default {
  name: 'App',
  components: { Settings: Settings, CalendarPicker: CalendarPicker },
  data: function () {
    return {
      records: [],
      showSettings: false,
      imageCache: {},
      theme: 'system',
      isDark: false,
      showToast: false,
      toastText: '',
      toastTimer: null,
      showSearch: false,
      searchQuery: '',
      searchType: 'all',
      searchDate: 'all',
      searchDateStart: '',
      searchDateEnd: '',
      showCalStart: false,
      showCalEnd: false,
    };
  },
  computed: {
    filteredRecords: function () {
      var self = this;
      var list = this.records;

      if (this.searchType !== 'all') {
        list = list.filter(function (item) { return item.type === self.searchType; });
      }

      if (this.searchQuery.trim()) {
        var q = this.searchQuery.toLowerCase();
        list = list.filter(function (item) {
          if (item.type === 'text') {
            return item.content.toLowerCase().indexOf(q) !== -1;
          }
          return false;
        });
      }

      if (this.searchDate !== 'all') {
        var now = new Date();
        var cutoff = null;
        if (this.searchDate === 'today') {
          cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        } else if (this.searchDate === '7days') {
          cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (this.searchDate === '30days') {
          cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        } else if (this.searchDate === 'custom') {
          if (this.searchDateStart && this.searchDateEnd) {
            var start = new Date(this.searchDateStart);
            var end = new Date(this.searchDateEnd + 'T23:59:59');
            return list.filter(function (item) {
              var d = new Date(item.createdAt);
              return d >= start && d <= end;
            });
          } else if (this.searchDateStart) {
            var s = new Date(this.searchDateStart);
            return list.filter(function (item) { return new Date(item.createdAt) >= s; });
          } else if (this.searchDateEnd) {
            var e = new Date(this.searchDateEnd + 'T23:59:59');
            return list.filter(function (item) { return new Date(item.createdAt) <= e; });
          }
          return list;
        }
        if (cutoff) {
          list = list.filter(function (item) { return new Date(item.createdAt) >= cutoff; });
        }
      }
      return list;
    },
  },
  mounted: function () {
    this.loadTheme();
    this.loadHistory();
    var self = this;
    ipcRenderer.on('clipboard-changed', function () { self.loadHistory(); });
    this._mql = window.matchMedia('(prefers-color-scheme: dark)');
    this._mql.addEventListener('change', function () {
      if (self.theme === 'system') self.applyTheme();
    });
    ipcRenderer.on('window-shown', function () {
      if (self.showSettings) { self.showSettings = false; self.loadTheme(); }
      if (self.showSearch) {
        self.showSearch = false;
        self.resetSearch();
      }
      self.showCalStart = false;
      self.showCalEnd = false;
    });
  },
  beforeDestroy: function () {
    ipcRenderer.removeAllListeners('clipboard-changed');
    ipcRenderer.removeAllListeners('window-shown');
  },
  methods: {
    onThemePreview: function (t) { this.theme = t; this.applyTheme(); },
    onSettingsClose: function () { this.showSettings = false; this.loadTheme(); },
    loadTheme: function () {
      var self = this;
      ipcRenderer.invoke('get-config').then(function (cfg) { self.theme = cfg.theme || 'system'; self.applyTheme(); });
    },
    applyTheme: function () {
      var dark = this.theme === 'dark' || (this.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      this.isDark = dark;
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    },
    loadHistory: function () {
      var self = this;
      var myId = ++loadId;
      ipcRenderer.invoke('get-history').then(function (list) {
        if (myId !== loadId) return;
        if (list.length === 0) { self.records = []; return; }
        var pending = 0;
        var done = false;
        function checkDone() { if (done && pending === 0 && myId === loadId) self.records = list; }
        done = true;
        for (var i = 0; i < list.length; i++) {
          var item = list[i];
          if (item.type === 'image') {
            if (self.imageCache[item.content]) {
              item._imageUrl = self.imageCache[item.content];
            } else {
              pending++;
              (function (rec) {
                ipcRenderer.invoke('read-image', rec.content).then(function (dataUrl) {
                  self.imageCache[rec.content] = dataUrl || '';
                  rec._imageUrl = dataUrl || '';
                  pending--;
                  checkDone();
                });
              })(item);
            }
          }
        }
        checkDone();
      });
    },
    toggleSearch: function () {
      this.showSearch = !this.showSearch;
      if (!this.showSearch) {
        this.resetSearch();
      } else {
        var self = this;
        this.$nextTick(function () { if (self.$refs.searchInput) self.$refs.searchInput.focus(); });
      }
    },
    onCalStart: function (val) { this.searchDateStart = val; this.showCalStart = false; },
    onCalEnd: function (val) { this.searchDateEnd = val; this.showCalEnd = false; },
    resetSearch: function () {
      this.searchQuery = '';
      this.searchType = 'all';
      this.searchDate = 'all';
      this.searchDateStart = '';
      this.searchDateEnd = '';
    },
    handleCopy: function (item) {
      var self = this;
      var fn = item.type === 'text' ? 'copy-text' : 'copy-image';
      ipcRenderer.invoke(fn, item.content).then(function () {
        self.showToastMsg(item.type === 'text' ? '已复制文字' : '已复制图片');
      });
    },
    showToastMsg: function (msg) {
      var self = this;
      if (self.toastTimer) clearTimeout(self.toastTimer);
      self.toastText = msg;
      self.showToast = true;
      self.toastTimer = setTimeout(function () { self.showToast = false; }, 1500);
    },
    handleDelete: function (id) {
      var self = this;
      for (var i = 0; i < self.records.length; i++) {
        if (self.records[i].id === id && self.records[i].type === 'image') {
          delete self.imageCache[self.records[i].content]; break;
        }
      }
      ipcRenderer.invoke('delete-record', id).then(function () { self.loadHistory(); });
    },
    handleClearAll: function () {
      if (confirm('确定要清空所有剪贴板记录吗？')) {
        var self = this;
        self.imageCache = {};
        ipcRenderer.invoke('clear-all').then(function () { self.loadHistory(); });
      }
    },
    handleSaveSettings: function (config) {
      var self = this;
      ipcRenderer.invoke('save-config', config).then(function () {
        self.showSettings = false;
        self.theme = config.theme || 'system';
        self.applyTheme();
        self.loadHistory();
      });
    },
    formatTime: function (isoString) {
      var date = new Date(isoString);
      var now = new Date();
      var diff = now - date;
      if (diff < 60000) return '刚刚';
      if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前';
      if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      var y = new Date(now); y.setDate(y.getDate() - 1);
      if (date.toDateString() === y.toDateString()) return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    },
    formatSize: function (b) {
      if (b < 1024) return b + ' B';
      if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
      return (b / 1048576).toFixed(1) + ' MB';
    },
  },
};
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif; background: transparent; overflow: hidden; }

.tray-container { position: relative; width: 100%; height: 100vh; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.18); display: flex; flex-direction: column; }

/* 标题栏 */
.header { display: flex; align-items: center; padding: 11px 14px; background: #f5f5f7; border-bottom: 1px solid #e0e0e0; -webkit-app-region: drag; }
.header-title { font-size: 13px; font-weight: 600; color: #1d1d1f; letter-spacing: -0.1px; }
.header-hint { font-size: 11px; color: #aeaeb2; margin-left: 8px; }
.header-actions { margin-left: auto; display: flex; gap: 2px; -webkit-app-region: no-drag; }
.icon-btn { background: none; border: none; font-size: 14px; cursor: pointer; padding: 5px 7px; border-radius: 6px; transition: background 0.15s; color: #6e6e73; }
.icon-btn:hover { background: rgba(0,0,0,0.06); }
.icon-btn.active { background: rgba(0,122,255,0.12); color: #007aff; }
.icon-btn:focus { outline: none; }

/* 搜索面板 */
.search-panel { background: #f5f5f7; border-bottom: 1px solid #e0e0e0; padding: 10px 14px; overflow: hidden; }
.search-box { display: flex; align-items: center; background: #fff; border: 1px solid #d2d2d7; border-radius: 8px; padding: 0 10px; height: 32px; margin-bottom: 10px; }
.search-box:focus-within { border-color: #007aff; box-shadow: 0 0 0 3px rgba(0,122,255,0.12); }
.search-icon { font-size: 12px; margin-right: 6px; color: #8e8e93; }
.search-input { flex: 1; border: none; outline: none; font-size: 13px; color: #1d1d1f; background: transparent; }
.search-input::placeholder { color: #c7c7cc; }
.search-clear { background: #c7c7cc; border: none; color: #fff; width: 16px; height: 16px; border-radius: 50%; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; line-height: 1; padding: 0; }
.search-clear:hover { background: #8e8e93; }

.filter-section { display: flex; flex-direction: column; gap: 6px; }
.filter-row { display: flex; align-items: center; gap: 8px; overflow-x: auto; }
.filter-label { font-size: 11px; color: #8e8e93; flex-shrink: 0; width: 28px; font-weight: 500; }
.filter-pills { display: flex; gap: 4px; flex-wrap: nowrap; white-space: nowrap; }
.pill { padding: 4px 12px; font-size: 12px; font-weight: 500; border: 1px solid #d2d2d7; border-radius: 16px; cursor: pointer; color: #6e6e73; background: #fff; transition: all 0.15s; white-space: nowrap; flex-shrink: 0; }
.pill:hover { border-color: #007aff; color: #007aff; }
.pill.active { background: #007aff; border-color: #007aff; color: #fff; box-shadow: 0 1px 4px rgba(0,122,255,0.2); }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }
.date-range { display: flex; align-items: center; gap: 8px; margin-top: 2px; padding-left: 36px; overflow: hidden; }
.date-pick {
  padding: 0 6px 0 10px; font-size: 12px; border: 1px solid #d2d2d7; border-radius: 8px;
  background: #fff; cursor: pointer; min-width: 130px;
  transition: border-color 0.15s; height: 30px; display: flex;
  align-items: center; justify-content: space-between;
}
.date-pick:hover { border-color: #007aff; }
.date-pick-text { color: #1d1d1f; font-size: 12px; }
.date-pick-text.empty { color: #c7c7cc; }
.date-clear {
  background: none; border: none; font-size: 10px; color: #c7c7cc;
  cursor: pointer; padding: 2px 4px; border-radius: 4px; line-height: 1;
  flex-shrink: 0;
}
.date-clear:hover { color: #8e8e93; background: rgba(0,0,0,0.04); }
.date-sep { font-size: 11px; color: #8e8e93; }
.search-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 6px; padding-top: 6px; border-top: 1px solid #e0e0e0; }
.result-count { font-size: 11px; color: #007aff; font-weight: 500; }
.reset-btn { background: none; border: none; font-size: 11px; color: #8e8e93; cursor: pointer; padding: 2px 6px; border-radius: 4px; }
.reset-btn:hover { color: #007aff; background: rgba(0,122,255,0.06); }

/* 统计栏 */
.stats-bar { display: flex; align-items: center; justify-content: space-between; padding: 5px 14px; background: #fafafa; border-bottom: 1px solid #f0f0f0; }
.stats-text { font-size: 11px; color: #aeaeb2; }
.clear-btn { background: none; border: none; font-size: 11px; color: #ff3b30; cursor: pointer; padding: 2px 6px; border-radius: 4px; }
.clear-btn:hover { background: rgba(255,59,48,0.08); }

/* 记录列表 */
.record-list { flex: 1; overflow-y: auto; padding: 2px 0; }
.record-list::-webkit-scrollbar { width: 4px; }
.record-list::-webkit-scrollbar-thumb { background: #d1d1d6; border-radius: 2px; }
.record-item { display: flex; align-items: flex-start; padding: 9px 12px; border-bottom: 1px solid #f5f5f5; cursor: pointer; transition: background 0.1s, opacity 0.3s ease, transform 0.3s ease; }
.record-item:hover { background: #f5f5f5; }
.record-content { flex: 1; display: flex; gap: 8px; min-width: 0; }
.record-type-badge { flex-shrink: 0; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; font-size: 13px; background: #f5f5f7; border-radius: 6px; margin-top: 2px; }
.record-body { flex: 1; min-width: 0; }
.text-preview { font-size: 12px; color: #1d1d1f; line-height: 1.4; word-break: break-all; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; max-height: 52px; }
.image-preview img { max-width: 100%; max-height: 100px; border-radius: 6px; border: 1px solid #e5e5ea; }
.image-placeholder { font-size: 11px; color: #c7c7cc; padding: 14px 0; text-align: center; }
.record-meta { display: flex; align-items: center; gap: 6px; margin-top: 3px; }
.record-time { font-size: 10px; color: #aeaeb2; }
.record-size { font-size: 10px; color: #c7c7cc; }
.record-actions { display: flex; margin-left: 6px; flex-shrink: 0; opacity: 0; transition: opacity 0.15s; }
.record-item:hover .record-actions { opacity: 1; }
.action-btn { background: none; border: 1px solid #d2d2d7; font-size: 11px; cursor: pointer; padding: 3px 5px; border-radius: 4px; line-height: 1; }
.delete-btn:hover { background: #fff0f0; border-color: #ff3b30; }
.empty-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #8e8e93; }
.empty-icon { font-size: 36px; margin-bottom: 10px; opacity: 0.4; }
.empty-text { font-size: 13px; margin-bottom: 4px; font-weight: 500; }
.empty-hint { font-size: 11px; color: #c7c7cc; }

/* Toast */
.toast { position: fixed; top: 50px; left: 50%; transform: translateX(-50%); z-index: 10; padding: 5px 14px; border-radius: 16px; background: rgba(0,0,0,0.72); color: #fff; font-size: 12px; font-weight: 500; white-space: nowrap; backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); }
.fade-toast-enter-active, .fade-toast-leave-active { transition: all 0.2s ease; }
.fade-toast-enter, .fade-toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(-4px); }

/* ==================== 过渡动画 ==================== */

/* 搜索面板滑入滑出 */
.search-slide-enter-active {
  animation: searchSlideDown 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}
.search-slide-leave-active {
  animation: searchSlideDown 0.2s cubic-bezier(0.4, 0, 1, 1) reverse;
}
@keyframes searchSlideDown {
  from { opacity: 0; max-height: 0; padding-top: 0; padding-bottom: 0; }
  to { opacity: 1; max-height: 300px; padding-top: 10px; padding-bottom: 10px; }
}

/* 自定义日期区域展开收起 */
.expand-enter-active {
  animation: expandDown 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}
.expand-leave-active {
  animation: expandDown 0.18s cubic-bezier(0.4, 0, 1, 1) reverse;
}
@keyframes expandDown {
  from { opacity: 0; max-height: 0; }
  to { opacity: 1; max-height: 60px; }
}

/* 日历弹窗缩放弹出 */
.cal-pop-enter-active {
  animation: calPopIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.cal-pop-leave-active {
  animation: calPopIn 0.18s cubic-bezier(0.4, 0, 1, 1) reverse;
}
@keyframes calPopIn {
  from { opacity: 0; transform: scale(0.92); }
  to { opacity: 1; transform: scale(1); }
}

/* 记录列表项动画 */
.record-item-enter-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.record-item-leave-active {
  transition: opacity 0.15s ease;
}
.record-item-enter {
  opacity: 0;
  transform: translateY(-4px);
}
.record-item-leave-to {
  opacity: 0;
}
.record-item-move {
  transition: transform 0.25s ease;
}

/* 空状态淡入淡出 */
.fade-enter-active { animation: fadeIn 0.2s ease; }
.fade-leave-active { animation: fadeIn 0.15s ease reverse; }
@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.97); }
  to { opacity: 1; transform: scale(1); }
}

/* 设置弹窗模态动画 */
.modal-enter-active .settings-panel {
  animation: modalPanelIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.modal-leave-active .settings-panel {
  animation: modalPanelIn 0.2s cubic-bezier(0.4, 0, 1, 1) reverse;
}
.modal-enter-active {
  animation: overlayFadeIn 0.25s ease;
}
.modal-leave-active {
  animation: overlayFadeIn 0.2s ease reverse;
}
@keyframes overlayFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes modalPanelIn {
  from { opacity: 0; transform: scale(0.93) translateY(8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

/* ==================== 深色主题 ==================== */
[data-theme="dark"] .tray-container { background: #1c1c1e; }
[data-theme="dark"] .header { background: #2c2c2e; border-bottom-color: #3a3a3c; }
[data-theme="dark"] .header-title { color: #f2f2f7; }
[data-theme="dark"] .header-hint { color: #636366; }
[data-theme="dark"] .icon-btn { color: #98989d; }
[data-theme="dark"] .icon-btn:hover { background: rgba(255,255,255,0.08); }
[data-theme="dark"] .icon-btn.active { background: rgba(10,132,255,0.2); color: #0a84ff; }
[data-theme="dark"] .search-panel { background: #232326; border-bottom-color: #3a3a3c; }
[data-theme="dark"] .search-box { background: #1c1c1e; border-color: #48484a; }
[data-theme="dark"] .search-box:focus-within { border-color: #0a84ff; box-shadow: 0 0 0 3px rgba(10,132,255,0.15); }
[data-theme="dark"] .search-icon { color: #636366; }
[data-theme="dark"] .search-input { color: #f2f2f7; }
[data-theme="dark"] .search-input::placeholder { color: #48484a; }
[data-theme="dark"] .search-clear { background: #48484a; }
[data-theme="dark"] .search-clear:hover { background: #636366; }
[data-theme="dark"] .filter-label { color: #636366; }
[data-theme="dark"] .pill { background: #2c2c2e; border-color: #48484a; color: #98989d; }
[data-theme="dark"] .pill:hover { border-color: #0a84ff; color: #0a84ff; }
[data-theme="dark"] .pill.active { background: #0a84ff; border-color: #0a84ff; color: #fff; }
[data-theme="dark"] .date-pick { background: #1c1c1e; border-color: #48484a; }
[data-theme="dark"] .date-pick:hover { border-color: #0a84ff; }
[data-theme="dark"] .date-pick-text { color: #f2f2f7; }
[data-theme="dark"] .date-pick-text.empty { color: #48484a; }
[data-theme="dark"] .date-clear { color: #48484a; }
[data-theme="dark"] .date-clear:hover { color: #98989d; background: rgba(255,255,255,0.06); }
[data-theme="dark"] .date-sep { color: #636366; }
[data-theme="dark"] .search-footer { border-top-color: #3a3a3c; }
[data-theme="dark"] .reset-btn { color: #636366; }
[data-theme="dark"] .reset-btn:hover { color: #0a84ff; background: rgba(10,132,255,0.08); }
[data-theme="dark"] .stats-bar { background: #232326; border-bottom-color: #2c2c2e; }
[data-theme="dark"] .stats-text { color: #636366; }
[data-theme="dark"] .record-item { border-bottom-color: #2c2c2e; }
[data-theme="dark"] .record-item:hover { background: #2c2c2e; }
[data-theme="dark"] .record-type-badge { background: #2c2c2e; }
[data-theme="dark"] .text-preview { color: #e5e5ea; }
[data-theme="dark"] .image-placeholder { color: #48484a; }
[data-theme="dark"] .record-time { color: #636366; }
[data-theme="dark"] .record-size { color: #48484a; }
[data-theme="dark"] .action-btn { border-color: #48484a; background: #2c2c2e; }
[data-theme="dark"] .delete-btn:hover { background: rgba(255,59,48,0.12); border-color: rgba(255,59,48,0.3); }
[data-theme="dark"] .empty-state { color: #636366; }
[data-theme="dark"] .empty-hint { color: #48484a; }
[data-theme="dark"] .image-preview img { border-color: #3a3a3c; }
[data-theme="dark"] .toast { background: rgba(44,44,46,0.85); }
[data-theme="dark"] .record-list::-webkit-scrollbar-thumb { background: #48484a; }
</style>
